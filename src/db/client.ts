import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const rawConnectionString = process.env.DATABASE_URL ?? process.env.EXPO_PUBLIC_DATABASE_URL ?? '';
const connectionString = rawConnectionString.replace(/^['"]|['"]$/g, '').trim();

if (!connectionString) {
  throw new Error('DATABASE_URL or EXPO_PUBLIC_DATABASE_URL must be set');
}

const client = postgres(connectionString, { ssl: 'require', max: 1 });
export const db = drizzle(client);
