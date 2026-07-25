import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? process.env.EXPO_PUBLIC_DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
