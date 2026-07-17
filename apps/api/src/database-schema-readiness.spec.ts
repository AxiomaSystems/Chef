import { join, resolve } from 'node:path';
import { KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1 } from './database-migration-fingerprint-ledger.v1';
import {
  evaluateSchemaCompatibility,
  getExpectedMigrationVersion,
  getMigrationDirectoryCandidates,
  getPackagedMigrations,
} from './database-schema-readiness';

function knownProductionHistory() {
  const packaged = getPackagedMigrations([
    resolve(__dirname, '../prisma/migrations'),
  ]);
  const packagedByName = new Map(
    packaged.map((migration) => [migration.name, migration.checksum]),
  );
  const knownByName = new Map(
    KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1.map((migration) => [
      migration.name,
      migration.checksum,
    ]),
  );

  return {
    packaged,
    applied: [...new Set([...packagedByName.keys(), ...knownByName.keys()])]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({
        name,
        checksum: knownByName.get(name) ?? packagedByName.get(name) ?? '',
        finished: true,
        rolledBack: false,
      })),
  };
}

describe('database schema readiness', () => {
  const previous = '20260627124500_backfill_recipe_profiles';
  const current = '20260628120000_add_recipe_execution_metadata';
  const optionalLegacy = '20260628000000_optional_legacy_history';
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

  it('accepts the exact known active production history', () => {
    const history = knownProductionHistory();

    expect(
      evaluateSchemaCompatibility({
        ...history,
        minimumCompatible: current,
        knownFingerprints: KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
      }),
    ).toBe('ready');
  });

  it('accepts clean packaged history when the production ledger is provided', () => {
    const packaged = getPackagedMigrations([
      resolve(__dirname, '../prisma/migrations'),
    ]);

    expect(
      evaluateSchemaCompatibility({
        packaged,
        applied: packaged.map((migration) => ({
          ...migration,
          finished: true,
          rolledBack: false,
        })),
        minimumCompatible: current,
        knownFingerprints: KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
      }),
    ).toBe('ready');
  });

  it('accepts an optional ledger-only row in its exact ordered position', () => {
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
          {
            name: optionalLegacy,
            checksum: futureChecksum,
            finished: true,
            rolledBack: false,
          },
          { name: current, checksum, finished: true, rolledBack: false },
        ],
        minimumCompatible: current,
        knownFingerprints: [{ name: optionalLegacy, checksum: futureChecksum }],
      }),
    ).toBe('ready');
  });

  it('keeps the versioned ledger limited to verified packaged drift and the database-only migration', () => {
    const packaged = getPackagedMigrations([
      resolve(__dirname, '../prisma/migrations'),
    ]);
    const packagedByName = new Map(
      packaged.map((migration) => [migration.name, migration.checksum]),
    );
    const databaseOnly =
      KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1.filter(
        (migration) => !packagedByName.has(migration.name),
      );
    const packagedDrift =
      KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1.filter((migration) =>
        packagedByName.has(migration.name),
      );

    expect(databaseOnly).toEqual([
      {
        name: '20260515120000_active_shopping_cart_lifecycle',
        checksum:
          'c2aa36b6852d3553973ba35743da7fcf05cc8f810de86dcd1b1a1b2c6a288e96',
      },
    ]);
    expect(packagedDrift).toHaveLength(11);
    expect(
      packagedDrift.every(
        (migration) =>
          packagedByName.get(migration.name) !== migration.checksum,
      ),
    ).toBe(true);
  });

  it('rejects an unrecorded migration name in otherwise known history', () => {
    const history = knownProductionHistory();

    expect(
      evaluateSchemaCompatibility({
        ...history,
        applied: [
          ...history.applied,
          {
            name: '20260628000000_unrecorded_history',
            checksum: 'f'.repeat(64),
            finished: true,
            rolledBack: false,
          },
        ].sort((left, right) => left.name.localeCompare(right.name)),
        minimumCompatible: current,
        knownFingerprints: KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
      }),
    ).toBe('divergent');
  });

  it('rejects an altered checksum for a recorded production migration', () => {
    const history = knownProductionHistory();

    expect(
      evaluateSchemaCompatibility({
        ...history,
        applied: history.applied.map((migration) =>
          migration.name === '20260515120000_active_shopping_cart_lifecycle'
            ? { ...migration, checksum: 'f'.repeat(64) }
            : migration,
        ),
        minimumCompatible: current,
        knownFingerprints: KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
      }),
    ).toBe('divergent');
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

  it('distinguishes a missing required suffix from a required interior gap', () => {
    const first = '20260627120000_first';
    const middle = '20260627130000_middle';
    const last = '20260627140000_last';
    const packaged = [
      { name: first, checksum: previousChecksum },
      { name: middle, checksum },
      { name: last, checksum: futureChecksum },
    ];
    const applied = (name: string, migrationChecksum: string) => ({
      name,
      checksum: migrationChecksum,
      finished: true,
      rolledBack: false,
    });

    expect(
      evaluateSchemaCompatibility({
        packaged,
        applied: [applied(first, previousChecksum)],
        minimumCompatible: first,
      }),
    ).toBe('behind');
    expect(
      evaluateSchemaCompatibility({
        packaged,
        applied: [
          applied(first, previousChecksum),
          applied(last, futureChecksum),
        ],
        minimumCompatible: first,
      }),
    ).toBe('divergent');
  });

  it('accepts a strictly newer compatible database-ahead suffix', () => {
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
