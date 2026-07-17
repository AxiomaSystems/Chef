describe('matching provider constants', () => {
  const originalKrogerFlag = process.env.KROGER_USE_REAL_PROVIDER;

  afterEach(() => {
    if (originalKrogerFlag === undefined) {
      delete process.env.KROGER_USE_REAL_PROVIDER;
    } else {
      process.env.KROGER_USE_REAL_PROVIDER = originalKrogerFlag;
    }

    jest.resetModules();
  });

  it('keeps Kroger disabled when its real-provider flag is omitted', () => {
    delete process.env.KROGER_USE_REAL_PROVIDER;
    jest.resetModules();

    const { KROGER_USE_REAL_PROVIDER } = jest.requireActual<
      typeof import('./matching.constants')
    >('./matching.constants');

    expect(KROGER_USE_REAL_PROVIDER).toBe(false);
  });
});
