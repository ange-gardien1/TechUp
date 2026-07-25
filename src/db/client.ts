import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const rawConnectionString = process.env.DATABASE_URL ?? process.env.EXPO_PUBLIC_DATABASE_URL ?? '';
const connectionString = rawConnectionString.replace(/^['"]|['"]$/g, '').trim();

if (!connectionString) {
  throw new Error('DATABASE_URL or EXPO_PUBLIC_DATABASE_URL must be set');
}

const client = postgres(connectionString, { ssl: 'require', max: 1 });
export const db = drizzle(client);
