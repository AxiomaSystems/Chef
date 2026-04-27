import { existsSync, readFileSync } from 'node:fs';
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
loadEnvFile(resolve(__dirname, '../.env'));
