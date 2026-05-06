import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function getMissingOrEmptyKeys(keys: string[]) {
  return keys.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === '';
  });
}

function validateCriticalEnv() {
  const criticalKeys = [
    'DATABASE_URL',
    'DIRECT_URL',
    'AUTH_JWT_SECRET',
    'AUTH_ACCESS_TOKEN_EXPIRES_IN',
    'AUTH_REFRESH_TOKEN_EXPIRES_IN_DAYS',
  ];

  const missingKeys = getMissingOrEmptyKeys(criticalKeys);

  if (missingKeys.length > 0) {
    throw new Error(
      `[ENV] Missing critical backend env vars: ${missingKeys.join(', ')}. ` +
        'Set them in root .env (copy from .env.example).',
    );
  }
}

function warnProviderEnvMisconfigurations() {
  if (
    process.env.KROGER_USE_REAL_PROVIDER === 'true' &&
    getMissingOrEmptyKeys(['KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET']).length > 0
  ) {
    console.warn(
      '[ENV] KROGER_USE_REAL_PROVIDER=true but Kroger credentials are missing. Provider will not work until credentials are set.',
    );
  }

  if (
    process.env.INSTACART_USE_REAL_PROVIDER === 'true' &&
    getMissingOrEmptyKeys(['INSTACART_API_KEY']).length > 0
  ) {
    console.warn(
      '[ENV] INSTACART_USE_REAL_PROVIDER=true but INSTACART_API_KEY is missing. Provider will not work until it is set.',
    );
  }

  if (
    process.env.WALMART_USE_REAL_PROVIDER === 'true' &&
    getMissingOrEmptyKeys(['WALMART_CLIENT_ID', 'WALMART_CLIENT_SECRET']).length > 0
  ) {
    console.warn(
      '[ENV] WALMART_USE_REAL_PROVIDER=true but Walmart credentials are missing. Provider will not work until credentials are set.',
    );
  }
}

function stripOptionalQuotes(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if (
    (quote === '"' || quote === "'") &&
    trimmed.length >= 2 &&
    trimmed[trimmed.length - 1] === quote
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function encodeSupabasePasswordAtSigns(value: string | undefined) {
  if (!value) return value;

  try {
    new URL(value);
    return value;
  } catch {
    // Supabase passwords can contain "@".
    // If copied unescaped, URL parsing treats it as another host separator.
    const schemeSeparatorIndex = value.indexOf('://');
    const lastAtIndex = value.lastIndexOf('@');

    if (schemeSeparatorIndex < 0 || lastAtIndex < 0) return value;

    const authStartIndex = schemeSeparatorIndex + 3;
    const authSegment = value.slice(authStartIndex, lastAtIndex);
    const passwordSeparatorIndex = authSegment.indexOf(':');

    if (passwordSeparatorIndex < 0) return value;

    const username = authSegment.slice(0, passwordSeparatorIndex);
    const password = authSegment.slice(passwordSeparatorIndex + 1);
    const encodedPassword = password.replace(/@/g, '%40');

    return `${value.slice(0, authStartIndex)}${username}:${encodedPassword}${value.slice(lastAtIndex)}`;
  }
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripOptionalQuotes(line.slice(separatorIndex + 1));

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
}

loadEnvFile(resolve(__dirname, '../../../.env'));

process.env.DATABASE_URL =
  encodeSupabasePasswordAtSigns(process.env.SUPABASE_DATABASE_URL) ??
  encodeSupabasePasswordAtSigns(process.env.DATABASE_URL);
process.env.DIRECT_URL =
  encodeSupabasePasswordAtSigns(process.env.SUPABASE_DIRECT_URL) ??
  encodeSupabasePasswordAtSigns(process.env.DIRECT_URL) ??
  process.env.DATABASE_URL;

validateCriticalEnv();
warnProviderEnvMisconfigurations();
