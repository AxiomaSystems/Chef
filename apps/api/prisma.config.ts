import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';
import { resolve } from 'node:path';

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
  if (!existsSync(path)) return;

  const contents = readFileSync(path, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = stripOptionalQuotes(line.slice(separatorIndex + 1));

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(__dirname, '../../.env'));
loadEnvFile(resolve(__dirname, '.env'));

process.env.DATABASE_URL =
  encodeSupabasePasswordAtSigns(process.env.SUPABASE_DATABASE_URL) ??
  encodeSupabasePasswordAtSigns(process.env.DATABASE_URL);
process.env.DIRECT_URL =
  encodeSupabasePasswordAtSigns(process.env.SUPABASE_DIRECT_URL) ??
  encodeSupabasePasswordAtSigns(process.env.DIRECT_URL) ??
  process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
