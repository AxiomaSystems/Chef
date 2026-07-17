import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
  type MigrationFingerprint,
} from './database-migration-fingerprint-ledger.v1';

const MIGRATION_VERSION_PATTERN = /^\d{14}_[a-z0-9_]+$/;
const MIGRATION_CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;

export type PackagedMigration = { name: string; checksum: string };
export type AppliedMigration = {
  name: string;
  checksum: string;
  finished: boolean;
  rolledBack: boolean;
};

export type SchemaCompatibilityStatus =
  | 'ready'
  | 'ahead_compatible'
  | 'behind'
  | 'divergent'
  | 'failed'
  | 'incompatible';

type RuntimePaths = {
  cwd?: string;
  moduleDirectory?: string;
};

export function isMigrationVersionName(value: unknown): value is string {
  return typeof value === 'string' && MIGRATION_VERSION_PATTERN.test(value);
}

export function getMigrationDirectoryCandidates(
  paths: RuntimePaths = {},
): string[] {
  const cwd = paths.cwd ?? process.cwd();
  const moduleDirectory = paths.moduleDirectory ?? __dirname;

  return [
    resolve(cwd, 'prisma', 'migrations'),
    resolve(moduleDirectory, '..', 'prisma', 'migrations'),
    resolve(moduleDirectory, '..', '..', 'prisma', 'migrations'),
  ].filter((candidate, index, candidates) => {
    return candidates.indexOf(candidate) === index;
  });
}

export function getExpectedMigrationVersion(
  candidates: string[] = getMigrationDirectoryCandidates(),
): string {
  const expectedVersion = getPackagedMigrations(candidates).at(-1)?.name;
  if (expectedVersion) {
    return expectedVersion;
  }

  throw new Error('[ENV] API migrations directory is unavailable.');
}

export function getPackagedMigrations(
  candidates: string[] = getMigrationDirectoryCandidates(),
): PackagedMigration[] {
  const packagedByName = new Map<string, string>();

  for (const candidate of candidates) {
    let candidateMigrations: PackagedMigration[];
    try {
      candidateMigrations = readdirSync(candidate, {
        withFileTypes: true,
      })
        .filter(
          (entry) => entry.isDirectory() && isMigrationVersionName(entry.name),
        )
        .map((entry) => {
          const sql = readFileSync(
            resolve(candidate, entry.name, 'migration.sql'),
            'utf8',
          ).replace(/\r\n?/g, '\n');
          return {
            name: entry.name,
            checksum: createHash('sha256').update(sql).digest('hex'),
          };
        });
    } catch {
      // Try the next source/runtime layout without exposing filesystem paths.
      continue;
    }

    for (const migration of candidateMigrations) {
      const existingChecksum = packagedByName.get(migration.name);
      if (existingChecksum && existingChecksum !== migration.checksum) {
        throw new Error('[ENV] Packaged migration checksums diverge.');
      }
      packagedByName.set(migration.name, migration.checksum);
    }
  }

  const migrations = [...packagedByName.entries()]
    .map(([name, checksum]) => ({ name, checksum }))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (migrations.length > 0) {
    return migrations;
  }

  throw new Error('[ENV] API migrations directory is unavailable.');
}

export function evaluateSchemaCompatibility(input: {
  packaged: PackagedMigration[];
  applied: AppliedMigration[];
  minimumCompatible: string;
  knownFingerprints?: readonly MigrationFingerprint[];
}): SchemaCompatibilityStatus {
  const packaged = [...input.packaged].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const knownFingerprints = [...(input.knownFingerprints ?? [])];
  const activeApplied = input.applied.filter(
    (migration) => !migration.rolledBack,
  );

  if (activeApplied.some((migration) => !migration.finished)) {
    return 'failed';
  }

  if (
    packaged.length === 0 ||
    !isMigrationVersionName(input.minimumCompatible) ||
    packaged.some(
      (migration) =>
        !isMigrationVersionName(migration.name) ||
        !MIGRATION_CHECKSUM_PATTERN.test(migration.checksum),
    ) ||
    knownFingerprints.some(
      (migration) =>
        !isMigrationVersionName(migration.name) ||
        !MIGRATION_CHECKSUM_PATTERN.test(migration.checksum),
    ) ||
    activeApplied.some(
      (migration) =>
        !isMigrationVersionName(migration.name) ||
        !MIGRATION_CHECKSUM_PATTERN.test(migration.checksum),
    ) ||
    new Set(packaged.map((migration) => migration.name)).size !==
      packaged.length ||
    new Set(knownFingerprints.map((migration) => migration.name)).size !==
      knownFingerprints.length ||
    new Set(activeApplied.map((migration) => migration.name)).size !==
      activeApplied.length ||
    activeApplied.some(
      (migration, index) =>
        index > 0 && activeApplied[index - 1].name >= migration.name,
    )
  ) {
    return 'divergent';
  }

  const expected = packaged.at(-1)?.name;
  if (!expected) {
    return 'divergent';
  }
  if (expected < input.minimumCompatible) {
    return 'incompatible';
  }

  const acceptedChecksums = new Map<string, Set<string>>();
  for (const migration of packaged) {
    acceptedChecksums.set(migration.name, new Set([migration.checksum]));
  }
  for (const migration of knownFingerprints) {
    const checksums =
      acceptedChecksums.get(migration.name) ?? new Set<string>();
    checksums.add(migration.checksum);
    acceptedChecksums.set(migration.name, checksums);
  }
  const packagedNames = new Set(packaged.map((migration) => migration.name));
  const expectedHistory = [...acceptedChecksums.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ name, required: packagedNames.has(name) }));

  let appliedIndex = 0;
  for (const expectedMigration of expectedHistory) {
    const appliedMigration = activeApplied[appliedIndex];
    if (!appliedMigration) {
      if (expectedMigration.required) {
        return 'behind';
      }
      continue;
    }
    if (appliedMigration.name > expectedMigration.name) {
      if (expectedMigration.required) {
        return 'divergent';
      }
      continue;
    }
    if (
      appliedMigration.name < expectedMigration.name ||
      !acceptedChecksums
        .get(expectedMigration.name)
        ?.has(appliedMigration.checksum)
    ) {
      return 'divergent';
    }
    appliedIndex += 1;
  }

  if (appliedIndex === activeApplied.length) {
    return 'ready';
  }
  return activeApplied
    .slice(appliedIndex)
    .every((migration) => migration.name > expected)
    ? 'ahead_compatible'
    : 'divergent';
}

export function getKnownActiveProductionMigrationFingerprints(): readonly MigrationFingerprint[] {
  return KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1;
}
