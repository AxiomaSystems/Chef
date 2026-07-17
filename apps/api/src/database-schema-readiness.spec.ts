import { join, resolve } from 'node:path';
import {
  evaluateSchemaCompatibility,
  getExpectedMigrationVersion,
  getMigrationDirectoryCandidates,
  getPackagedMigrations,
} from './database-schema-readiness';

describe('database schema readiness', () => {
  const previous = '20260627124500_backfill_recipe_profiles';
  const current = '20260628120000_add_recipe_execution_metadata';
  const futureExpand = '20260717170000_add_database_release_compatibility';
  const checksum = 'a'.repeat(64);
  const previousChecksum = 'b'.repeat(64);
  const futureChecksum = 'c'.repeat(64);

  it('derives the expected version from the latest repository migration', () => {
    expect(
      getExpectedMigrationVersion([resolve(__dirname, '../prisma/migrations')]),
    ).toBe(current);
  });

  it('hashes every packaged migration and preserves checksum parity', () => {
    const packaged = getPackagedMigrations([
      resolve(__dirname, '../prisma/migrations'),
    ]);

    expect(packaged.length).toBeGreaterThan(1);
    expect(packaged.at(-1)?.name).toBe(current);
    expect(packaged.at(-1)?.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(
      evaluateSchemaCompatibility({
        packaged,
        applied: packaged.map((migration) => ({
          ...migration,
          finished: true,
          rolledBack: false,
        })),
        minimumCompatible: current,
      }),
    ).toBe('ready');
  });

  it('reports a database that is behind packaged history', () => {
    expect(
      evaluateSchemaCompatibility({
        packaged: [
          { name: previous, checksum: previousChecksum },
          { name: current, checksum },
        ],
        applied: [
          {
            name: previous,
            checksum: previousChecksum,
            finished: true,
            rolledBack: false,
          },
        ],
        minimumCompatible: previous,
      }),
    ).toBe('behind');
  });

  it('accepts a compatible database-ahead history', () => {
    expect(
      evaluateSchemaCompatibility({
        packaged: [{ name: current, checksum }],
        applied: [
          { name: current, checksum, finished: true, rolledBack: false },
          {
            name: futureExpand,
            checksum: futureChecksum,
            finished: true,
            rolledBack: false,
          },
        ],
        minimumCompatible: current,
      }),
    ).toBe('ahead_compatible');
  });

  it('fails when migration history contains an unfinished active attempt', () => {
    expect(
      evaluateSchemaCompatibility({
        packaged: [{ name: current, checksum }],
        applied: [
          { name: current, checksum, finished: true, rolledBack: false },
          {
            name: futureExpand,
            checksum: futureChecksum,
            finished: false,
            rolledBack: false,
          },
        ],
        minimumCompatible: current,
      }),
    ).toBe('failed');
  });

  it('reports checksum divergence across the complete packaged history', () => {
    expect(
      evaluateSchemaCompatibility({
        packaged: [
          { name: previous, checksum: previousChecksum },
          { name: current, checksum },
        ],
        applied: [
          {
            name: previous,
            checksum: 'd'.repeat(64),
            finished: true,
            rolledBack: false,
          },
          { name: current, checksum, finished: true, rolledBack: false },
        ],
        minimumCompatible: previous,
      }),
    ).toBe('divergent');
  });

  it('rejects an API below a raised compatibility floor', () => {
    expect(
      evaluateSchemaCompatibility({
        packaged: [{ name: current, checksum }],
        applied: [
          { name: current, checksum, finished: true, rolledBack: false },
          {
            name: futureExpand,
            checksum: futureChecksum,
            finished: true,
            rolledBack: false,
          },
        ],
        minimumCompatible: futureExpand,
      }),
    ).toBe('incompatible');
  });

  it('fails closed when migrations are unavailable', () => {
    expect(() =>
      getExpectedMigrationVersion([
        resolve(__dirname, '../prisma/migrations-not-packaged'),
      ]),
    ).toThrow('API migrations directory is unavailable');
  });

  it('includes the Docker runtime migration path when running built output', () => {
    const apiRoot = resolve(__dirname, '..');

    expect(
      getMigrationDirectoryCandidates({
        cwd: apiRoot,
        moduleDirectory: join(apiRoot, 'dist', 'src'),
      }),
    ).toContain(join(apiRoot, 'prisma', 'migrations'));
  });
});
