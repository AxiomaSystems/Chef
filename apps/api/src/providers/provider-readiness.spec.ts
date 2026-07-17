describe('provider readiness modes', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnvironment,
      KROGER_USE_REAL_PROVIDER: 'false',
      INSTACART_USE_REAL_PROVIDER: 'false',
      INSTACART_ENV: 'production',
      WALMART_USE_REAL_PROVIDER: 'false',
      WALMART_ENV: 'production',
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
    jest.resetModules();
  });

  it('exposes only the effective retailer endpoint mode', () => {
    const { getProviderReadiness } = jest.requireActual<
      typeof import('./provider-readiness')
    >('./provider-readiness');

    expect(getProviderReadiness('kroger')).toMatchObject({
      mode: 'production',
    });
    expect(getProviderReadiness('instacart')).toMatchObject({
      mode: 'production',
    });
    expect(getProviderReadiness('walmart')).toMatchObject({
      mode: 'production',
    });
  });

  it('normalizes unknown retailer modes to their safe non-production endpoint', () => {
    process.env.INSTACART_ENV = 'unknown';
    process.env.WALMART_ENV = 'unknown';
    jest.resetModules();
    const { getProviderReadiness } = jest.requireActual<
      typeof import('./provider-readiness')
    >('./provider-readiness');

    expect(getProviderReadiness('instacart')).toMatchObject({
      mode: 'development',
    });
    expect(getProviderReadiness('walmart')).toMatchObject({ mode: 'sandbox' });
  });

  it('does not report disabled providers as available when credentials exist', () => {
    process.env.KROGER_CLIENT_ID = 'test-kroger-id';
    process.env.KROGER_CLIENT_SECRET = 'test-kroger-secret';
    process.env.INSTACART_API_KEY = 'test-instacart-key';
    process.env.WALMART_CLIENT_ID = 'test-walmart-id';
    process.env.WALMART_CLIENT_SECRET = 'test-walmart-secret';
    jest.resetModules();
    const { getProviderReadiness } = jest.requireActual<
      typeof import('./provider-readiness')
    >('./provider-readiness');

    expect(getProviderReadiness('kroger')).toMatchObject({
      status: 'disabled',
      isAvailable: false,
    });
    expect(getProviderReadiness('instacart')).toMatchObject({
      status: 'disabled',
      isAvailable: false,
    });
    expect(getProviderReadiness('walmart')).toMatchObject({
      status: 'partner_required',
      isAvailable: false,
    });
  });

  it('reports enabled providers with credentials as configured and available', () => {
    process.env.KROGER_USE_REAL_PROVIDER = 'true';
    process.env.KROGER_CLIENT_ID = 'test-kroger-id';
    process.env.KROGER_CLIENT_SECRET = 'test-kroger-secret';
    process.env.INSTACART_USE_REAL_PROVIDER = 'true';
    process.env.INSTACART_API_KEY = 'test-instacart-key';
    process.env.WALMART_USE_REAL_PROVIDER = 'true';
    process.env.WALMART_CLIENT_ID = 'test-walmart-id';
    process.env.WALMART_CLIENT_SECRET = 'test-walmart-secret';
    jest.resetModules();
    const { getProviderReadiness } = jest.requireActual<
      typeof import('./provider-readiness')
    >('./provider-readiness');

    for (const retailer of ['kroger', 'instacart', 'walmart'] as const) {
      expect(getProviderReadiness(retailer)).toMatchObject({
        status: 'configured',
        isAvailable: true,
      });
    }
  });
});
