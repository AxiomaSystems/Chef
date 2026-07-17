import {
  getApiFeatureReadiness,
  validateApiEnvironment,
} from './environment-readiness';

const productionEnvironment = (): NodeJS.ProcessEnv => ({
  DEPLOYMENT_ENVIRONMENT: 'production',
  CHEF_LLM_PROVIDER: 'openai',
  OPENAI_API_KEY: 'test-openai-key',
  VISION_API_BASE_URL: 'https://vision.example.com',
  API_CORS_ORIGINS: 'https://app.example.com,https://www.example.com',
  API_ENABLE_DOCS: 'false',
  RUN_DB_SEED_ON_STARTUP: 'false',
  KROGER_USE_REAL_PROVIDER: 'false',
  INSTACART_USE_REAL_PROVIDER: 'false',
  WALMART_USE_REAL_PROVIDER: 'false',
});

describe('API environment readiness', () => {
  it('accepts a complete production profile', () => {
    expect(() => validateApiEnvironment(productionEnvironment())).not.toThrow();
  });

  it('accepts production with Kroger omitted because providers are opt-in', () => {
    const environment = productionEnvironment();
    delete environment.KROGER_USE_REAL_PROVIDER;

    expect(() => validateApiEnvironment(environment)).not.toThrow();
  });

  it('aggregates failures without including secret values', () => {
    const environment = productionEnvironment();
    environment.CHEF_LLM_PROVIDER = 'mock';
    environment.OPENAI_API_KEY = 'do-not-leak-this-value';
    environment.VISION_API_BASE_URL = 'http://localhost:8000';

    expect(() => validateApiEnvironment(environment)).toThrow(
      'CHEF_LLM_PROVIDER must be openai in production',
    );
    expect(() => validateApiEnvironment(environment)).toThrow(
      'VISION_API_BASE_URL must use HTTPS in production',
    );
    expect(() => validateApiEnvironment(environment)).toThrow(
      'VISION_API_BASE_URL must not use localhost in production',
    );
    expect(() => validateApiEnvironment(environment)).not.toThrow(
      'do-not-leak-this-value',
    );
  });

  it.each([
    [
      'mock AI',
      { CHEF_LLM_PROVIDER: 'mock' },
      'CHEF_LLM_PROVIDER must be openai in production',
    ],
    [
      'a missing OpenAI key',
      { OPENAI_API_KEY: '' },
      'OPENAI_API_KEY is required in production',
    ],
    [
      'a non-HTTPS Vision URL',
      { VISION_API_BASE_URL: 'http://vision.example.com' },
      'VISION_API_BASE_URL must use HTTPS in production',
    ],
    [
      'a localhost Vision URL',
      { VISION_API_BASE_URL: 'https://localhost:8000' },
      'VISION_API_BASE_URL must not use localhost in production',
    ],
    [
      'a non-HTTPS CORS origin',
      { API_CORS_ORIGINS: 'http://app.example.com' },
      'API_CORS_ORIGINS must contain only HTTPS origins in production',
    ],
    [
      'a localhost CORS origin',
      { API_CORS_ORIGINS: 'https://localhost:3000' },
      'API_CORS_ORIGINS must not contain localhost origins in production',
    ],
    [
      'enabled docs',
      { API_ENABLE_DOCS: 'true' },
      'API_ENABLE_DOCS must be false in production',
    ],
    [
      'startup seed',
      { RUN_DB_SEED_ON_STARTUP: 'true' },
      'RUN_DB_SEED_ON_STARTUP must be false in production',
    ],
    [
      'incomplete Kroger credentials',
      { KROGER_USE_REAL_PROVIDER: 'true' },
      'KROGER_CLIENT_ID and KROGER_CLIENT_SECRET are required when KROGER_USE_REAL_PROVIDER=true',
    ],
    [
      'incomplete Instacart credentials',
      { INSTACART_USE_REAL_PROVIDER: 'true' },
      'INSTACART_API_KEY is required when INSTACART_USE_REAL_PROVIDER=true',
    ],
    [
      'incomplete Walmart credentials',
      { WALMART_USE_REAL_PROVIDER: 'true' },
      'WALMART_CLIENT_ID and WALMART_CLIENT_SECRET are required when WALMART_USE_REAL_PROVIDER=true',
    ],
  ])('rejects production with %s', (_scenario, overrides, expectedMessage) => {
    expect(() =>
      validateApiEnvironment({ ...productionEnvironment(), ...overrides }),
    ).toThrow(expectedMessage);
  });

  it.each([
    [
      'a real AI provider',
      { CHEF_LLM_PROVIDER: 'openai' },
      'CHEF_LLM_PROVIDER must be mock in staging',
    ],
    [
      'Kroger enabled',
      { KROGER_USE_REAL_PROVIDER: 'true' },
      'KROGER_USE_REAL_PROVIDER must be false in staging',
    ],
    [
      'Instacart enabled',
      { INSTACART_USE_REAL_PROVIDER: 'true' },
      'INSTACART_USE_REAL_PROVIDER must be false in staging',
    ],
    [
      'Walmart enabled',
      { WALMART_USE_REAL_PROVIDER: 'true' },
      'WALMART_USE_REAL_PROVIDER must be false in staging',
    ],
    [
      'docs enabled',
      { API_ENABLE_DOCS: 'true' },
      'API_ENABLE_DOCS must be false in staging',
    ],
    [
      'startup seed enabled',
      { RUN_DB_SEED_ON_STARTUP: 'true' },
      'RUN_DB_SEED_ON_STARTUP must be false in staging',
    ],
  ])('rejects staging with %s', (_scenario, overrides, expectedMessage) => {
    expect(() =>
      validateApiEnvironment({
        ...productionEnvironment(),
        DEPLOYMENT_ENVIRONMENT: 'staging',
        CHEF_LLM_PROVIDER: 'mock',
        ...overrides,
      }),
    ).toThrow(expectedMessage);
  });

  it('reports AI and Vision feature configuration without exposing values', () => {
    expect(
      getApiFeatureReadiness({
        CHEF_LLM_PROVIDER: 'openai',
        OPENAI_API_KEY: 'test-openai-key',
        VISION_API_BASE_URL: 'https://vision.example.com',
      }),
    ).toEqual({
      ai: { status: 'ready' },
      vision: { status: 'ready' },
    });
  });

  it('reports disabled and misconfigured optional features', () => {
    expect(
      getApiFeatureReadiness({
        CHEF_LLM_PROVIDER: 'mock',
        VISION_API_BASE_URL: 'not-a-url',
      }),
    ).toEqual({
      ai: { status: 'disabled' },
      vision: { status: 'misconfigured' },
    });
  });
});
