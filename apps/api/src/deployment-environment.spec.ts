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

  it('accepts distinct staging database and Vision hosts', () => {
    expect(() =>
      validateDeploymentIsolation({
        RAILWAY_ENVIRONMENT_NAME: 'staging',
        DATABASE_URL: 'postgresql://user:pass@db.staging.example/preppie',
        PRODUCTION_DATABASE_HOST: 'db.production.example',
        VISION_API_BASE_URL: 'https://vision-staging.example.com',
        PRODUCTION_VISION_API_BASE_URL: 'https://vision.example.com',
      }),
    ).not.toThrow();
  });

  it('rejects a production database host in staging', () => {
    expect(() =>
      validateDeploymentIsolation({
        RAILWAY_ENVIRONMENT_NAME: 'staging',
        DATABASE_URL: 'postgresql://user:pass@db.production.example/preppie',
        PRODUCTION_DATABASE_HOST: 'db.production.example',
        VISION_API_BASE_URL: 'https://vision-staging.example.com',
        PRODUCTION_VISION_API_BASE_URL: 'https://vision.example.com',
      }),
    ).toThrow('Staging cannot use the production database host');
  });

  it('rejects the production Vision origin in staging', () => {
    expect(() =>
      validateDeploymentIsolation({
        RAILWAY_ENVIRONMENT_NAME: 'staging',
        DATABASE_URL: 'postgresql://user:pass@db.staging.example/preppie',
        PRODUCTION_DATABASE_HOST: 'db.production.example',
        VISION_API_BASE_URL: 'https://vision.example.com/path',
        PRODUCTION_VISION_API_BASE_URL: 'https://vision.example.com',
      }),
    ).toThrow('Staging cannot use the production Vision origin');
  });
});
