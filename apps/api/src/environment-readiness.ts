import { getDeploymentEnvironment } from './deployment-environment';

export type ApiFeatureStatus = 'ready' | 'disabled' | 'misconfigured';

type ApiFeature = {
  status: ApiFeatureStatus;
};

export type ApiFeatureReadiness = {
  ai: ApiFeature;
  vision: ApiFeature;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const RETAILER_CREDENTIALS = [
  {
    flag: 'KROGER_USE_REAL_PROVIDER',
    credentials: ['KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET'],
  },
  {
    flag: 'INSTACART_USE_REAL_PROVIDER',
    credentials: ['INSTACART_API_KEY'],
  },
  {
    flag: 'WALMART_USE_REAL_PROVIDER',
    credentials: ['WALMART_CLIENT_ID', 'WALMART_CLIENT_SECRET'],
  },
] as const;

function hasValue(env: NodeJS.ProcessEnv, key: string) {
  return Boolean(env[key]?.trim());
}

function parseHttpUrl(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

function isLocalUrl(url: URL) {
  return LOCAL_HOSTS.has(url.hostname.toLowerCase());
}

function validateProductionEnvironment(
  env: NodeJS.ProcessEnv,
  errors: string[],
) {
  if (env.CHEF_LLM_PROVIDER !== 'openai') {
    errors.push('CHEF_LLM_PROVIDER must be openai in production.');
  }

  if (!hasValue(env, 'OPENAI_API_KEY')) {
    errors.push('OPENAI_API_KEY is required in production.');
  }

  const visionUrl = parseHttpUrl(env.VISION_API_BASE_URL);
  if (!hasValue(env, 'VISION_API_BASE_URL')) {
    errors.push('VISION_API_BASE_URL is required in production.');
  } else if (!visionUrl) {
    errors.push(
      'VISION_API_BASE_URL must be a valid HTTP(S) URL in production.',
    );
  } else {
    if (visionUrl.protocol !== 'https:') {
      errors.push('VISION_API_BASE_URL must use HTTPS in production.');
    }

    if (isLocalUrl(visionUrl)) {
      errors.push('VISION_API_BASE_URL must not use localhost in production.');
    }
  }

  validateProductionCorsOrigins(env, errors);
  requireFalse(env, 'API_ENABLE_DOCS', 'production', errors);
  requireFalse(env, 'RUN_DB_SEED_ON_STARTUP', 'production', errors);
}

function validateProductionCorsOrigins(
  env: NodeJS.ProcessEnv,
  errors: string[],
) {
  const origins = (env.API_CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    errors.push(
      'API_CORS_ORIGINS must contain at least one origin in production.',
    );
    return;
  }

  const parsedOrigins = origins.map(parseHttpUrl);
  if (parsedOrigins.some((origin) => !origin)) {
    errors.push(
      'API_CORS_ORIGINS must contain valid HTTP(S) origins in production.',
    );
    return;
  }

  const validOrigins = parsedOrigins as URL[];
  if (validOrigins.some((origin) => origin.protocol !== 'https:')) {
    errors.push(
      'API_CORS_ORIGINS must contain only HTTPS origins in production.',
    );
  }

  if (validOrigins.some(isLocalUrl)) {
    errors.push(
      'API_CORS_ORIGINS must not contain localhost origins in production.',
    );
  }
}

function validateStagingEnvironment(env: NodeJS.ProcessEnv, errors: string[]) {
  if (env.CHEF_LLM_PROVIDER !== 'mock') {
    errors.push('CHEF_LLM_PROVIDER must be mock in staging.');
  }

  for (const { flag } of RETAILER_CREDENTIALS) {
    requireFalse(env, flag, 'staging', errors);
  }

  requireFalse(env, 'API_ENABLE_DOCS', 'staging', errors);
  requireFalse(env, 'RUN_DB_SEED_ON_STARTUP', 'staging', errors);
}

function requireFalse(
  env: NodeJS.ProcessEnv,
  key: string,
  environment: string,
  errors: string[],
) {
  if (env[key] !== 'false') {
    errors.push(`${key} must be false in ${environment}.`);
  }
}

function validateEnabledRetailers(env: NodeJS.ProcessEnv, errors: string[]) {
  for (const { flag, credentials } of RETAILER_CREDENTIALS) {
    if (env[flag] !== 'true') {
      continue;
    }

    const missingCredentials = credentials.filter((key) => !hasValue(env, key));
    if (missingCredentials.length > 0) {
      const verb = credentials.length === 1 ? 'is' : 'are';
      errors.push(
        `${credentials.join(' and ')} ${verb} required when ${flag}=true.`,
      );
    }
  }
}

export function validateApiEnvironment(env: NodeJS.ProcessEnv): void {
  const environment = getDeploymentEnvironment(env);
  const errors: string[] = [];

  if (environment === 'production') {
    validateProductionEnvironment(env, errors);
  }

  if (environment === 'staging') {
    validateStagingEnvironment(env, errors);
  }

  validateEnabledRetailers(env, errors);

  if (errors.length > 0) {
    throw new Error(
      `[ENV] API environment validation failed: ${errors.join(' ')}`,
    );
  }
}

export function getApiFeatureReadiness(
  env: NodeJS.ProcessEnv,
): ApiFeatureReadiness {
  const ai = getAiFeatureReadiness(env);
  const vision = getVisionFeatureReadiness(env);

  return { ai, vision };
}

function getAiFeatureReadiness(env: NodeJS.ProcessEnv): ApiFeature {
  const provider = env.CHEF_LLM_PROVIDER ?? 'mock';

  if (provider === 'mock') {
    return { status: 'disabled' };
  }

  if (provider !== 'openai' || !hasValue(env, 'OPENAI_API_KEY')) {
    return { status: 'misconfigured' };
  }

  return { status: 'ready' };
}

function getVisionFeatureReadiness(env: NodeJS.ProcessEnv): ApiFeature {
  if (!hasValue(env, 'VISION_API_BASE_URL')) {
    return { status: 'disabled' };
  }

  return {
    status: parseHttpUrl(env.VISION_API_BASE_URL) ? 'ready' : 'misconfigured',
  };
}
