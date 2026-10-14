import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function loadLocalEnvironment() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnvironment();

let resolvedTokenSecret: string | undefined;

export function getAuthTokenSecret() {
  if (resolvedTokenSecret) return resolvedTokenSecret;

  const configuredTokenSecret = process.env.AUTH_TOKEN_SECRET;
  if (configuredTokenSecret && Buffer.byteLength(configuredTokenSecret) < 32) {
    throw new Error('AUTH_TOKEN_SECRET must contain at least 32 bytes.');
  }
  if (!configuredTokenSecret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_TOKEN_SECRET must be configured in production.');
  }
  if (!configuredTokenSecret) {
    console.warn('AUTH_TOKEN_SECRET is not configured; sessions will be invalidated when this development server restarts.');
    resolvedTokenSecret = crypto.randomBytes(32).toString('base64url');
    return resolvedTokenSecret;
  }
  resolvedTokenSecret = configuredTokenSecret;
  return resolvedTokenSecret;
}
