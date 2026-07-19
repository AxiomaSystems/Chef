jest.mock('./prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('./database-schema-readiness', () => {
  const actual = jest.requireActual<
    typeof import('./database-schema-readiness')
  >('./database-schema-readiness');

  return {
    ...actual,
    getKnownActiveProductionMigrationFingerprints: jest.fn(),
    getPackagedMigrations: jest.fn(),
  };
});

import { AppService } from './app.service';
import { KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1 } from './database-migration-fingerprint-ledger.v1';
import {
  getKnownActiveProductionMigrationFingerprints,
  getPackagedMigrations,
} from './database-schema-readiness';
import type { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  const queryRaw = jest.fn();
  const expectedMigration = '20260628120000_add_recipe_execution_metadata';
  const compatibilityMigration =
    '20260717170000_add_database_release_compatibility';
  const checksum = 'a'.repeat(64);
  const mockGetKnownActiveProductionMigrationFingerprints = jest.mocked(
    getKnownActiveProductionMigrationFingerprints,
  );
  const mockGetPackagedMigrations = jest.mocked(getPackagedMigrations);
  const actualGetPackagedMigrations = jest.requireActual<
    typeof import('./database-schema-readiness')
  >('./database-schema-readiness').getPackagedMigrations;
  const service = new AppService({
    $queryRaw: queryRaw,
  } as unknown as PrismaService);
  const environment = process.env;

  beforeEach(() => {
    queryRaw.mockReset();
    mockGetKnownActiveProductionMigrationFingerprints.mockReset();
    mockGetKnownActiveProductionMigrationFingerprints.mockReturnValue([]);
    mockGetPackagedMigrations.mockReset();
    mockGetPackagedMigrations.mockReturnValue([
      { name: expectedMigration, checksum },
    ]);
    process.env = {
      ...environment,
      CHEF_LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-openai-key',
      VISION_API_BASE_URL: 'https://vision.example.com',
      RAILWAY_GIT_COMMIT_SHA: '1'.repeat(40),
    };
  });

  afterAll(() => {
    process.env = environment;
  });

  function knownProductionMigrationRows() {
    const packaged = actualGetPackagedMigrations();
    const packagedByName = new Map(
      packaged.map((migration) => [migration.name, migration.checksum]),
    );
    const knownByName = new Map(
      KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1.map((migration) => [
        migration.name,
        migration.checksum,
      ]),
    );
    const rows = [...new Set([...packagedByName.keys(), ...knownByName.keys()])]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({
        migration_name: name,
        checksum: knownByName.get(name) ?? packagedByName.get(name) ?? '',
        finished_at: new Date(),
        rolled_back_at: null,
      }));

    return { packaged, rows };
  }

  function phaseAReleaseAgainstPhaseBDatabase() {
    const allPackaged = actualGetPackagedMigrations();
    const phaseBMigration = allPackaged.find(
      (migration) => migration.name === compatibilityMigration,
    );
    if (!phaseBMigration) {
      throw new Error('Phase B compatibility migration is not packaged.');
    }

    const packaged = allPackaged.filter(
      (migration) => migration.name !== compatibilityMigration,
    );
    const appliedByName = new Map(
      packaged.map((migration) => [migration.name, migration.checksum]),
    );
    for (const migration of KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1) {
      appliedByName.set(migration.name, migration.checksum);
    }
    appliedByName.set(phaseBMigration.name, phaseBMigration.checksum);

    const rows = [...appliedByName.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, migrationChecksum]) => ({
        migration_name: name,
        checksum: migrationChecksum,
        finished_at: new Date(),
        rolled_back_at: null,
      }));

    return { packaged, rows, phaseBMigration };
  }

  it('uses the packaged expectation when the compatibility table is absent', async () => {
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([
        {
          migration_name: expectedMigration,
          checksum,
          finished_at: new Date(),
          rolled_back_at: null,
        },
      ])
      .mockResolvedValueOnce([{ relation_name: null }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'ready',
      release: { revision: '1'.repeat(40) },
      database: {
        status: 'ready',
        schema: {
          status: 'ready',
          expected: expectedMigration,
          applied: expectedMigration,
          minimum_compatible: expectedMigration,
        },
      },
      features: {
        ai: { status: 'ready' },
        vision: {
          status: 'ready',
          readiness_scope: 'configuration',
          runtime_status: 'not_checked',
        },
      },
    });
    expect(readiness.providers).toMatchObject({
      kroger: { mode: 'production' },
      instacart: { mode: 'development' },
      walmart: { mode: 'sandbox' },
    });
  });

  it('reports the new API ready with the compatibility migration applied', async () => {
    const history = knownProductionMigrationRows();
    mockGetKnownActiveProductionMigrationFingerprints.mockReturnValueOnce(
      KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
    );
    mockGetPackagedMigrations.mockReturnValueOnce(history.packaged);
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce(history.rows)
      .mockResolvedValueOnce([
        { relation_name: '"DatabaseReleaseCompatibility"' },
      ])
      .mockResolvedValueOnce([{ minimumApiMigration: expectedMigration }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'ready',
      database: {
        status: 'ready',
        schema: {
          status: 'ready',
          expected: compatibilityMigration,
          applied: compatibilityMigration,
          minimum_compatible: expectedMigration,
        },
      },
    });
  });

  it('rejects an unrecorded name added to the known production history', async () => {
    const history = knownProductionMigrationRows();
    mockGetKnownActiveProductionMigrationFingerprints.mockReturnValueOnce(
      KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
    );
    mockGetPackagedMigrations.mockReturnValueOnce(history.packaged);
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce(
        [
          ...history.rows,
          {
            migration_name: '20260628000000_unrecorded_history',
            checksum: 'f'.repeat(64),
            finished_at: new Date(),
            rolled_back_at: null,
          },
        ].sort((left, right) =>
          left.migration_name.localeCompare(right.migration_name),
        ),
      )
      .mockResolvedValueOnce([{ relation_name: null }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: { status: 'divergent' },
      },
    });
  });

  it('rejects an altered checksum in the known production history', async () => {
    const history = knownProductionMigrationRows();
    mockGetKnownActiveProductionMigrationFingerprints.mockReturnValueOnce(
      KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
    );
    mockGetPackagedMigrations.mockReturnValueOnce(history.packaged);
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce(
        history.rows.map((migration) =>
          migration.migration_name ===
          '20260515120000_active_shopping_cart_lifecycle'
            ? { ...migration, checksum: 'f'.repeat(64) }
            : migration,
        ),
      )
      .mockResolvedValueOnce([{ relation_name: null }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: { status: 'divergent' },
      },
    });
  });

  it('rejects database-ahead history when the compatibility table is absent', async () => {
    const futureMigration = '20260717170000_add_database_release_compatibility';
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([
        {
          migration_name: expectedMigration,
          checksum,
          finished_at: new Date(),
          rolled_back_at: null,
        },
        {
          migration_name: futureMigration,
          checksum: 'b'.repeat(64),
          finished_at: new Date(),
          rolled_back_at: null,
        },
      ])
      .mockResolvedValueOnce([{ relation_name: null }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: {
          status: 'incompatible',
          expected: expectedMigration,
          applied: futureMigration,
          minimum_compatible: expectedMigration,
        },
      },
    });
  });

  it('keeps feature configuration when the database is unavailable', async () => {
    queryRaw.mockRejectedValueOnce(new Error('database unavailable'));
    process.env.CHEF_LLM_PROVIDER = 'mock';
    process.env.VISION_API_BASE_URL = 'not-a-url';

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: {
          status: 'unavailable',
          expected: expectedMigration,
          applied: null,
          minimum_compatible: null,
        },
      },
      features: {
        ai: { status: 'disabled' },
        vision: {
          status: 'misconfigured',
          readiness_scope: 'configuration',
          runtime_status: 'not_checked',
        },
      },
    });
    expect(readiness.providers).toEqual(expect.any(Object));
  });

  it('reports a database-behind schema as not ready', async () => {
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ relation_name: null }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: {
          status: 'behind',
          expected: expectedMigration,
          applied: null,
          minimum_compatible: expectedMigration,
        },
      },
    });
  });

  it('keeps a previous API ready against a compatible database-ahead history', async () => {
    const history = phaseAReleaseAgainstPhaseBDatabase();
    expect(history.packaged.length).toBeGreaterThan(1);
    expect(history.packaged.at(-1)?.name).toBe(expectedMigration);
    expect(history.rows.at(-1)).toMatchObject({
      migration_name: compatibilityMigration,
      checksum: history.phaseBMigration.checksum,
    });
    mockGetKnownActiveProductionMigrationFingerprints.mockReturnValueOnce(
      KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
    );
    mockGetPackagedMigrations.mockReturnValueOnce(history.packaged);
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce(history.rows)
      .mockResolvedValueOnce([
        { relation_name: '"DatabaseReleaseCompatibility"' },
      ])
      .mockResolvedValueOnce([{ minimumApiMigration: expectedMigration }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'ready',
      database: {
        status: 'ready',
        schema: {
          status: 'ahead_compatible',
          expected: expectedMigration,
          applied: compatibilityMigration,
          minimum_compatible: expectedMigration,
        },
      },
    });
  });

  it('rejects a previous API after the compatibility floor is raised', async () => {
    const history = phaseAReleaseAgainstPhaseBDatabase();
    expect(history.packaged.length).toBeGreaterThan(1);
    expect(history.packaged.at(-1)?.name).toBe(expectedMigration);
    expect(history.rows.at(-1)).toMatchObject({
      migration_name: compatibilityMigration,
      checksum: history.phaseBMigration.checksum,
    });
    mockGetKnownActiveProductionMigrationFingerprints.mockReturnValueOnce(
      KNOWN_ACTIVE_PRODUCTION_MIGRATION_FINGERPRINTS_V1,
    );
    mockGetPackagedMigrations.mockReturnValueOnce(history.packaged);
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce(history.rows)
      .mockResolvedValueOnce([
        { relation_name: '"DatabaseReleaseCompatibility"' },
      ])
      .mockResolvedValueOnce([{ minimumApiMigration: compatibilityMigration }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: {
          status: 'incompatible',
          expected: expectedMigration,
          applied: compatibilityMigration,
          minimum_compatible: compatibilityMigration,
        },
      },
    });
  });

  it('fails closed when compatibility table detection fails', async () => {
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([
        {
          migration_name: expectedMigration,
          checksum,
          finished_at: new Date(),
          rolled_back_at: null,
        },
      ])
      .mockRejectedValueOnce(new Error('sensitive table lookup failure'));

    const readiness = await service.getReadiness();

    expect(JSON.stringify(readiness)).not.toContain(
      'sensitive table lookup failure',
    );
    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: {
          status: 'unavailable',
          expected: expectedMigration,
          applied: expectedMigration,
          minimum_compatible: null,
        },
      },
    });
  });

  it('fails closed when present compatibility metadata cannot be read', async () => {
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([
        {
          migration_name: expectedMigration,
          checksum,
          finished_at: new Date(),
          rolled_back_at: null,
        },
      ])
      .mockResolvedValueOnce([
        { relation_name: '"DatabaseReleaseCompatibility"' },
      ])
      .mockRejectedValueOnce(new Error('sensitive metadata read failure'));

    const readiness = await service.getReadiness();

    expect(JSON.stringify(readiness)).not.toContain(
      'sensitive metadata read failure',
    );
    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: {
          status: 'unavailable',
          expected: expectedMigration,
          applied: expectedMigration,
          minimum_compatible: null,
        },
      },
    });
  });

  it('fails closed when the packaged migration directory is unavailable', async () => {
    queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockGetPackagedMigrations.mockImplementationOnce(() => {
      throw new Error('migration files unavailable');
    });

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: {
          status: 'unavailable',
          expected: null,
          applied: null,
          minimum_compatible: null,
        },
      },
    });
  });

  it('does not expose a raw migration query failure', async () => {
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockRejectedValueOnce(new Error('sensitive SQL failure'));

    const readiness = await service.getReadiness();

    expect(JSON.stringify(readiness)).not.toContain('sensitive SQL failure');
    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'not_ready',
        schema: {
          status: 'unavailable',
          expected: expectedMigration,
          applied: null,
          minimum_compatible: null,
        },
      },
    });
  });
});
