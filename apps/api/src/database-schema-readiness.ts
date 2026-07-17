import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
          );
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
}): SchemaCompatibilityStatus {
  const packaged = [...input.packaged].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const activeApplied = input.applied
    .filter((migration) => !migration.rolledBack)
    .sort((left, right) => left.name.localeCompare(right.name));

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
    activeApplied.some(
      (migration) =>
        !isMigrationVersionName(migration.name) ||
        !MIGRATION_CHECKSUM_PATTERN.test(migration.checksum),
    ) ||
    new Set(packaged.map((migration) => migration.name)).size !==
      packaged.length ||
    new Set(activeApplied.map((migration) => migration.name)).size !==
      activeApplied.length
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

  const commonLength = Math.min(packaged.length, activeApplied.length);
  for (let index = 0; index < commonLength; index += 1) {
    const expectedMigration = packaged[index];
    const appliedMigration = activeApplied[index];
    if (
      expectedMigration.name !== appliedMigration.name ||
      expectedMigration.checksum !== appliedMigration.checksum
    ) {
      return 'divergent';
    }
  }

  if (activeApplied.length < packaged.length) {
    return 'behind';
  }
  if (activeApplied.length === packaged.length) {
    return 'ready';
  }

  return activeApplied
    .slice(packaged.length)
    .every((migration) => migration.name > expected)
    ? 'ahead_compatible'
    : 'divergent';
}
