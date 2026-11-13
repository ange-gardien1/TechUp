# Vercel web and API deployment

The Expo Router web app and Express API deploy together to the existing Vercel project. Expo exports the static web app to `dist/`; the root `api/` handlers expose the Express app as Vercel Functions under `/api`. Vercel does not run `npm run server` as a separate always-on process.

## Branch deployment flow

- Pushes to `dev` run tests, apply Drizzle migrations to the staging database, then deploy the web app and API as a Vercel Preview.
- Merging `dev` into `main` runs tests, applies migrations to the production database, then creates a staged Vercel Production deployment without changing the production domains. Test the deployment-specific URL shown in Vercel. When approved, promote that deployment from the Vercel Deployments page.
- If tests or migrations fail, the Vercel deployment does not run.

For staged production deployments, disable **Auto-assign Custom Production Domains** in **Project → Settings → Environments → Production → Branch Tracking**. Keep the production domains assigned to Production. The staged deployment uses Production environment variables and the production database, so use it only for safe smoke tests.

## One-time setup

1. In Vercel, use the existing `tech-up-gamma` project with the repository root as its Root Directory, Framework Preset **Other**, build command `npm run web:build`, and output directory `dist`.
2. Set `DATABASE_URL` and `AUTH_TOKEN_SECRET` for both **Preview** and **Production** in Vercel. Use the matching Neon database URL and a stable, unique auth secret of at least 32 bytes per environment. Set `GOOGLE_WEB_CLIENT_ID` if browser Google sign-in is enabled.
3. Assign `www.techup.rw` and, if desired, `techup.rw` to the Production environment. Use the exact DNS records Vercel displays.
4. Configure GitHub Actions environments named `staging` and `production`. Add these secrets to each environment:
   - `DATABASE_URL`: the matching Neon connection string, used by Drizzle migrations.
   - `VERCEL_TOKEN`: an access token allowed to deploy the Vercel project.
   - `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`: values from the linked Vercel project's `.vercel/project.json`.
5. Disable Vercel's automatic Git deployments if using this workflow, so deployment only occurs after tests and migrations. Require reviews for merges to `main` and optionally require approval for the GitHub `production` environment.

The workflow does not require a Render deploy hook or a separate API base URL. Production and Preview browser clients use their Vercel origin with the `/api` prefix, matching the Vercel Function rewrites. Set database and auth secrets in Vercel's environment settings as well as the matching GitHub Actions environment; GitHub secrets used for migrations are not automatically available to Vercel Functions.

## API behavior and limits

- Vercel routes `/api` and `/api/*` to the Express function before applying the Expo SPA fallback. Existing API endpoints, including `GET /api/health` and `POST /api/auth/login`, continue to be handled by the Express app.
- Vercel Functions are request-based serverless handlers. Keep the local `npm run server` command for development only.
- Vercel limits function request bodies to 4.5 MB. JSON bodies are limited to 4 MB on Vercel; larger image uploads need direct object-storage uploads rather than passing base64 data through the function.
- Keep secrets out of source control and public `EXPO_PUBLIC_` variables. Do not seed production data.

## Database migrations

Use separate Neon databases/branches for staging and production. Keep staging data separate from sensitive production data. The workflow applies `npm run db:migrate` against the database URL in the matching GitHub Actions environment before deploying.

## Local development

Run the API and web app separately:

```sh
npm run server
npm run web
```

Set `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000` in `.env.local` for local browser development. Production and Preview web deployments use their own Vercel origin for API requests.
