jest.mock('./prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AppService } from './app.service';
import type { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  const queryRawUnsafe = jest.fn();
  const service = new AppService({
    $queryRawUnsafe: queryRawUnsafe,
  } as unknown as PrismaService);
  const environment = process.env;

  beforeEach(() => {
    queryRawUnsafe.mockReset();
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
    queryRawUnsafe.mockResolvedValueOnce([{ '?column?': 1 }]);

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'ready',
      database: { status: 'ready' },
      features: {
        ai: { status: 'ready' },
        vision: { status: 'ready' },
      },
    });
    expect(readiness.providers).toEqual(expect.any(Object));
  });

  it('keeps feature configuration when the database is unavailable', async () => {
    queryRawUnsafe.mockRejectedValueOnce(new Error('database unavailable'));
    process.env.CHEF_LLM_PROVIDER = 'mock';
    process.env.VISION_API_BASE_URL = 'not-a-url';

    const readiness = await service.getReadiness();

    expect(readiness).toMatchObject({
      status: 'not_ready',
      database: { status: 'not_ready' },
      features: {
        ai: { status: 'disabled' },
        vision: { status: 'misconfigured' },
      },
    });
    expect(readiness.providers).toEqual(expect.any(Object));
  });
});
