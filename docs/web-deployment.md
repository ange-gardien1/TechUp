# Vercel web and API deployment

The Expo Router web app and Express API deploy together to the same Vercel project. The static web export is published from `dist/`; the API is exposed as Vercel Functions under `/api`.

## Vercel project setup

1. In Vercel, use the existing `tech-up-gamma` project connected to this repository. Keep the Root Directory at the repository root, Framework Preset set to **Other**, the build command as `npm run web:build`, and the output directory as `dist`.
2. In the Vercel project settings, add `DATABASE_URL` and `AUTH_TOKEN_SECRET` to both **Preview** and **Production**. Use a Neon pooled connection string and a unique stable auth secret of at least 32 bytes for each environment. Do not copy production credentials into Preview. Add `GOOGLE_WEB_CLIENT_ID` if Google sign-in is enabled.
3. Keep `www.techup.rw` assigned to the Production environment. The API will also be served from that origin under `/api`; no API subdomain or CORS setup is required.
4. Configure the GitHub Actions `staging` and `production` environments with:
   - `DATABASE_URL`: the matching Neon connection string, used by Drizzle migrations.
   - `VERCEL_TOKEN`: a token authorized to deploy the Vercel project.
   - `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`: values from the linked project's `.vercel/project.json`.
5. Protect `main` with reviewed pull requests and require approval for the GitHub `production` environment before production migrations/deployment.

Pushes to `develop` run tests, build a Vercel Preview, apply migrations to the staging Neon database, then deploy the static site and API functions. A reviewed merge into `main` runs the same sequence against production. A failed test or migration stops deployment.

## API behavior and limits

- The Vercel function routes `/api` and `/api/*` to the existing Express app. The web client uses the same Vercel origin for API requests; mobile clients can continue using `EXPO_PUBLIC_API_BASE_URL` or their existing development URL.
- Vercel Functions are request-based serverless processes, not a continuously running Express server. Do not use `npm run server` as the Vercel start command.
- Vercel limits function request bodies to 4.5 MB. The app currently sends repair photos as base64 JSON, so the serverless deployment accepts JSON bodies up to 4 MB to stay within that platform limit. Larger image uploads need direct object-storage uploads rather than passing the image through the function.
- Keep secrets in Vercel environment settings and GitHub Actions environment secrets, not in source control or public `EXPO_PUBLIC_` variables. Do not seed production data.

## Database migrations

Create separate Neon databases/branches for staging and production. Set their credentials independently in Vercel Preview/Production and the matching GitHub Actions environment. The workflow applies `npm run db:migrate` before deploying. Ensure the staging branch does not contain sensitive production data.

The additive migrations use PostgreSQL `ADD COLUMN IF NOT EXISTS` for columns also created by the legacy development initializer. This lets a database initialized by the older setup be brought under Drizzle migration tracking without failing on those existing columns.

## Local development

Run the API and web app separately during local development:

```sh
npm run server
npm run web
```

Set `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000` in `.env.local` for the local web app. Vercel production web builds use the deployed site's `/api` path automatically.
