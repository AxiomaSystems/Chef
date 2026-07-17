import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_VERSION_PATTERN = /^\d{14}_[a-z0-9_]+$/;

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
  const migrationVersions: string[] = [];

  for (const candidate of candidates) {
    try {
      migrationVersions.push(
        ...readdirSync(candidate, { withFileTypes: true })
          .filter(
            (entry) =>
              entry.isDirectory() && isMigrationVersionName(entry.name),
          )
          .map((entry) => entry.name),
      );
    } catch {
      // Try the next source/runtime layout without exposing filesystem paths.
    }
  }

  const expectedVersion = migrationVersions.sort().at(-1);
  if (expectedVersion) {
    return expectedVersion;
  }

  throw new Error('[ENV] API migrations directory is unavailable.');
}
