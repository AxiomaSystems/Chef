import {
  getApiFeatureReadiness,
  validateApiEnvironment,
} from './environment-readiness';

const productionEnvironment = (): NodeJS.ProcessEnv => ({
  DEPLOYMENT_ENVIRONMENT: 'production',
  CHEF_LLM_PROVIDER: 'openai',
  OPENAI_API_KEY: 'test-openai-key',
  API_CORS_ORIGINS: 'https://app.example.com,https://www.example.com',
  API_ENABLE_DOCS: 'false',
  RUN_DB_SEED_ON_STARTUP: 'false',
  KROGER_USE_REAL_PROVIDER: 'false',
  INSTACART_USE_REAL_PROVIDER: 'false',
  WALMART_USE_REAL_PROVIDER: 'false',
});

const stagingEnvironment = (): NodeJS.ProcessEnv => ({
  DEPLOYMENT_ENVIRONMENT: 'staging',
  CHEF_LLM_PROVIDER: 'mock',
  API_CORS_ORIGINS: 'https://staging.example.com',
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

    expect(() => validateApiEnvironment(environment)).toThrow(
      'CHEF_LLM_PROVIDER must be openai in production',
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
    [
      'Instacart enabled outside its production mode',
      {
        INSTACART_USE_REAL_PROVIDER: 'true',
        INSTACART_API_KEY: 'test-instacart-key',
        INSTACART_ENV: 'development',
      },
      'INSTACART_ENV must be production when INSTACART_USE_REAL_PROVIDER=true in production',
    ],
    [
      'Walmart enabled outside its production mode',
      {
        WALMART_USE_REAL_PROVIDER: 'true',
        WALMART_CLIENT_ID: 'test-walmart-id',
        WALMART_CLIENT_SECRET: 'test-walmart-secret',
        WALMART_ENV: 'sandbox',
      },
      'WALMART_ENV must be production when WALMART_USE_REAL_PROVIDER=true in production',
    ],
  ])('rejects production with %s', (_scenario, overrides, expectedMessage) => {
    expect(() =>
      validateApiEnvironment({ ...productionEnvironment(), ...overrides }),
    ).toThrow(expectedMessage);
  });

  it.each([
    'https://127.0.0.2:3000',
    'https://[::ffff:127.0.0.1]:3000',
    'https://localhost.:3000',
  ])('rejects production loopback CORS origin %s', (corsOrigin) => {
    expect(() =>
      validateApiEnvironment({
        ...productionEnvironment(),
        API_CORS_ORIGINS: corsOrigin,
      }),
    ).toThrow(
      'API_CORS_ORIGINS must not contain localhost origins in production',
    );
  });

  it.each([
    'https://user:password@app.example.com',
    'https://app.example.com/',
    'https://app.example.com:443',
    'https://app.example.com/api',
    'https://app.example.com/%2e',
    'https://app.example.com/%2e%2e/admin',
    'https://app.example.com?preview=true',
    'https://app.example.com?',
    'https://app.example.com#fragment',
    'https://app.example.com#',
  ])('rejects non-origin production CORS value %s', (corsOrigin) => {
    expect(() =>
      validateApiEnvironment({
        ...productionEnvironment(),
        API_CORS_ORIGINS: corsOrigin,
      }),
    ).toThrow(
      'API_CORS_ORIGINS must contain origins without credentials, paths, queries, or fragments in production',
    );
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
      validateApiEnvironment({ ...stagingEnvironment(), ...overrides }),
    ).toThrow(expectedMessage);
  });

  it('accepts a complete staging profile', () => {
    expect(() => validateApiEnvironment(stagingEnvironment())).not.toThrow();
  });

  it.each([
    [
      'a missing origin',
      undefined,
      'API_CORS_ORIGINS must contain at least one origin in staging',
    ],
    [
      'an invalid URL',
      'not-a-url',
      'API_CORS_ORIGINS must contain valid HTTP(S) origins in staging',
    ],
    [
      'a non-HTTPS origin',
      'http://staging.example.com',
      'API_CORS_ORIGINS must contain only HTTPS origins in staging',
    ],
    [
      'a loopback origin',
      'https://127.0.0.2:3000',
      'API_CORS_ORIGINS must not contain localhost origins in staging',
    ],
    [
      'a trailing slash',
      'https://staging.example.com/',
      'API_CORS_ORIGINS must contain origins without credentials, paths, queries, or fragments in staging',
    ],
    [
      'a path',
      'https://staging.example.com/api',
      'API_CORS_ORIGINS must contain origins without credentials, paths, queries, or fragments in staging',
    ],
    [
      'a default port',
      'https://staging.example.com:443',
      'API_CORS_ORIGINS must contain origins without credentials, paths, queries, or fragments in staging',
    ],
  ])(
    'rejects staging CORS with %s',
    (_scenario, corsOrigins, expectedMessage) => {
      expect(() =>
        validateApiEnvironment({
          ...stagingEnvironment(),
          API_CORS_ORIGINS: corsOrigins,
        }),
      ).toThrow(expectedMessage);
    },
  );

  it('reports active AI feature readiness without exposing values', () => {
    expect(
      getApiFeatureReadiness({
        CHEF_LLM_PROVIDER: 'openai',
        OPENAI_API_KEY: 'test-openai-key',
      }),
    ).toEqual({ ai: { status: 'ready' } });
  });

  it('reports disabled AI readiness', () => {
    expect(getApiFeatureReadiness({ CHEF_LLM_PROVIDER: 'mock' })).toEqual({
      ai: { status: 'disabled' },
    });
  });
});
