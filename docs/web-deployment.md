# Staging and production deployment

The browser app uses the same Expo Router screens and API as the mobile app. Build the static web client locally with:

```sh
npm ci
npm run web:build
```

The generated site is in `dist/`. Vercel serves it using [`vercel.json`](../vercel.json), including Expo Router fallback rewrites. Render hosts the Express API using [`render.yaml`](../render.yaml).

## Environments

- Pushes to `develop` run tests, build a Vercel Preview, apply Drizzle migrations to the **staging** Neon database, then deploy the staging API to Render and the web app to Vercel.
- Merging a reviewed pull request into `main` runs these steps against the **production** Neon database and deploys production. Configure GitHub branch protection to require pull requests on `main`; add a required reviewer to the `production` GitHub Environment to gate production migrations and deployment.
- Staging and production each have their own `DATABASE_URL` and `AUTH_TOKEN_SECRET`. Do not point both environments at the same database. Keep real customer data out of staging; Neon branches can include a copy of their parent branch's data.
- If a migration fails, the workflow does not trigger the Render API or Vercel deployments.

## One-time setup

1. Create separate Neon branches/databases for staging and production. Use each environment's direct PostgreSQL connection string for migrations and ensure staging has no sensitive production data.
2. Push this configuration to `main` and `develop`. Import `render.yaml` as a Blueprint in Render. Set a distinct `DATABASE_URL` and stable `AUTH_TOKEN_SECRET` for each API service in Render's environment settings. Generate each secret with a password manager; do not commit or share it.
3. Create a Vercel project for this repository. Set the framework preset to **Other**, leave the Root Directory as the repository root, and disable Vercel automatic Git deployments because the workflow deploys only after migrations. Assign `www.techup.rw` to the Production environment. Use the exact DNS records Vercel shows for the domain; do not guess DNS targets. Add the apex `techup.rw` too only if you want it to redirect to `www.techup.rw`.
4. Create a deploy hook for each Render API service. In GitHub repository settings, create `staging` and `production` Actions Environments, and add these secrets to each:
   - `DATABASE_URL`: the matching Neon connection string.
   - `RENDER_API_DEPLOY_HOOK`: deploy hook URL for that environment's Render API.
   - `VERCEL_TOKEN`: a Vercel access token allowed to deploy this project.
   - `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`: the values from the linked Vercel project's `.vercel/project.json`.
   Also add the Actions Environment variable `EXPO_PUBLIC_API_BASE_URL`: the staging API's HTTPS origin in `staging`, and the production API's HTTPS origin in `production`.
5. Configure `main` branch protection so production changes arrive through reviewed pull requests. In GitHub's `production` Environment settings, require a reviewer so production migrations and deployments wait for approval.
6. Push to `develop`. Confirm the staging website and API work before merging future changes to `main`.

The Render Blueprint uses the free instance plan to avoid choosing a paid plan without your approval. Free API services can spin down when idle; select an appropriate paid Render plan before relying on production for always-on availability.

## Configure the web client

The workflow passes `EXPO_PUBLIC_API_BASE_URL` from the matching GitHub Actions Environment during the Vercel build: staging previews use the staging API, and production uses the production API. It must be an HTTPS origin without a trailing slash. This value is embedded in the public JavaScript bundle, so it must be a URL, never a secret. Production web builds never fall back to localhost.

For browser Google sign-in, also set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in the corresponding Vercel environments. Add each deployed website origin to the authorized origins for that OAuth client. See [Google authentication](./google-authentication.md) for the corresponding server setting.

## API configuration

- `DATABASE_URL` for the environment's PostgreSQL database.
- `AUTH_TOKEN_SECRET` with a stable random value of at least 32 bytes, unique per environment.
- `GOOGLE_WEB_CLIENT_ID` if Google sign-in is enabled.
- `PORT`, which Render provides.

The GitHub Actions workflow runs tests, pulls Vercel settings, builds the web app, and applies `npm run db:migrate` against the environment-specific database. Only after migrations succeed does it trigger the Render API and deploy the prebuilt site to Vercel. Add `GOOGLE_WEB_CLIENT_ID` to the corresponding Render API service and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to Vercel if browser Google sign-in is enabled; authorize `https://www.techup.rw` in Google Cloud.

Keep database credentials and server-only secrets in Render's environment settings and GitHub Actions Environment secrets, never in the web build environment or source control. Do not use the development seed command with production data.

## Local web development

Set `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000` in `.env.local`, start the API with `npm run server`, and run the web client with `npm run web`.
