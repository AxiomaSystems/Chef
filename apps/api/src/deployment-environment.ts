const DEPLOYMENT_ENVIRONMENTS = new Set([
  'local',
  'test',
  'preview',
  'staging',
  'production',
]);

export function getDeploymentEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.DEPLOYMENT_ENVIRONMENT ??
    env.RAILWAY_ENVIRONMENT_NAME ??
    env.VERCEL_ENV ??
    'local'
  )
    .trim()
    .toLowerCase();
}

function requireValue(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`[ENV] ${key} is required in staging.`);
  }

  return value;
}

function hostname(value: string, key: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    throw new Error(`[ENV] ${key} must be a valid URL.`);
  }
}

export function validateDeploymentIsolation(
  env: NodeJS.ProcessEnv = process.env,
) {
  const environment = getDeploymentEnvironment(env);

  if (!DEPLOYMENT_ENVIRONMENTS.has(environment)) {
    throw new Error(
      `[ENV] Unsupported deployment environment: ${environment}.`,
    );
  }

  if (environment !== 'staging') return;

  const databaseUrl = requireValue(env, 'DATABASE_URL');
  const productionDatabaseHost = requireValue(
    env,
    'PRODUCTION_DATABASE_HOST',
  ).toLowerCase();
  if (hostname(databaseUrl, 'DATABASE_URL') === productionDatabaseHost) {
    throw new Error('[ENV] Staging cannot use the production database host.');
  }
}
