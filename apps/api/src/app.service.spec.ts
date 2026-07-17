jest.mock('./prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('./database-schema-readiness', () => {
  const actual = jest.requireActual<
    typeof import('./database-schema-readiness')
  >('./database-schema-readiness');

  return {
    ...actual,
    getExpectedMigrationVersion: jest.fn(),
  };
});

import { AppService } from './app.service';
import { getExpectedMigrationVersion } from './database-schema-readiness';
import type { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  const queryRaw = jest.fn();
  const expectedMigration = '20260628120000_add_recipe_execution_metadata';
  const mockGetExpectedMigrationVersion = jest.mocked(
    getExpectedMigrationVersion,
  );
  const service = new AppService({
    $queryRaw: queryRaw,
  } as unknown as PrismaService);
  const environment = process.env;

  beforeEach(() => {
    queryRaw.mockReset();
    mockGetExpectedMigrationVersion.mockReset();
    mockGetExpectedMigrationVersion.mockReturnValue(expectedMigration);
    process.env = {
      ...environment,
      CHEF_LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-openai-key',
      VISION_API_BASE_URL: 'https://vision.example.com',
    };
  });

  afterAll(() => {
    process.env = environment;
  });

  it('adds AI and Vision configuration to a ready database response', async () => {
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([{ migration_name: expectedMigration }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'ready',
      database: {
        status: 'ready',
        schema: {
          status: 'ready',
          expected: expectedMigration,
          applied: expectedMigration,
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

  it('reports a schema mismatch as not ready without exposing SQL errors', async () => {
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([
        { migration_name: '20260627124500_backfill_recipe_profiles' },
      ]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'ready',
        schema: {
          status: 'mismatch',
          expected: expectedMigration,
          applied: '20260627124500_backfill_recipe_profiles',
        },
      },
    });
  });

  it('reports a missing applied migration as a schema mismatch', async () => {
    queryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'ready',
        schema: {
          status: 'mismatch',
          expected: expectedMigration,
          applied: null,
        },
      },
    });
  });

  it('fails closed when the packaged migration directory is unavailable', async () => {
    queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    mockGetExpectedMigrationVersion.mockImplementationOnce(() => {
      throw new Error('migration files unavailable');
    });

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: {
        status: 'ready',
        schema: {
          status: 'unavailable',
          expected: null,
          applied: null,
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
        status: 'ready',
        schema: {
          status: 'unavailable',
          expected: expectedMigration,
          applied: null,
        },
      },
    });
  });
});
