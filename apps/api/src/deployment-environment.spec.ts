import {
  getDeploymentEnvironment,
  validateDeploymentIsolation,
} from './deployment-environment';

describe('deployment environment isolation', () => {
  it('uses Railway environment identity when present', () => {
    expect(
      getDeploymentEnvironment({ RAILWAY_ENVIRONMENT_NAME: 'staging' }),
    ).toBe('staging');
  });

  it('does not require staging sentinels in production', () => {
    expect(() =>
      validateDeploymentIsolation({
        RAILWAY_ENVIRONMENT_NAME: 'production',
      }),
    ).not.toThrow();
  });

  it('accepts a distinct staging database host without Vision configuration', () => {
    expect(() =>
      validateDeploymentIsolation({
        RAILWAY_ENVIRONMENT_NAME: 'staging',
        DATABASE_URL: 'postgresql://user:pass@db.staging.example/preppie',
        PRODUCTION_DATABASE_HOST: 'db.production.example',
      }),
    ).not.toThrow();
  });

  it('rejects a production database host in staging', () => {
    expect(() =>
      validateDeploymentIsolation({
        RAILWAY_ENVIRONMENT_NAME: 'staging',
        DATABASE_URL: 'postgresql://user:pass@db.production.example/preppie',
        PRODUCTION_DATABASE_HOST: 'db.production.example',
      }),
    ).toThrow('Staging cannot use the production database host');
  });
});
