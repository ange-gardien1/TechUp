# Backend authentication

The API uses signed bearer tokens for authenticated routes. Login and registration return the token with the existing sanitized user object; the Expo client stores it in SecureStore on native platforms and attaches it to authenticated API requests. Web stores it through AsyncStorage.

Set `AUTH_TOKEN_SECRET` in the server environment to a stable, randomly generated secret of at least 32 bytes. Production server startup fails if the secret is missing or too short. Development can omit it, in which case the server generates an ephemeral secret and all tokens become invalid when the process restarts.

Tokens expire after eight hours and currently require the user to sign in again after expiry. Protected requests also verify that the account still exists and its role has not changed. Logout removes the token from the current client; it does not revoke a token already copied from that client before its expiry.

Existing SHA-256 password hashes are still verified for compatibility and upgraded to scrypt hashes after a successful login. New registrations and server-created default accounts use scrypt.

The health, root, login, registration, and public product/category reads remain unauthenticated. Other routes require a valid token and are subject to role and user-identity checks.

## Server setup

The API server does not create or alter database tables or seed demo data while serving requests. Apply checked-in Drizzle migrations explicitly with `npm run db:migrate`. For local development only, `npm run db:seed:dev` runs the legacy schema initializer and development seed data; it requires both `NODE_ENV=development` and `ALLOW_DEVELOPMENT_SEED=true`, enforced by both the script and initializer. Configure the server-only `DATABASE_URL` before either setup path. The `/health` endpoint is a liveness check; `/ready` checks database connectivity and the presence of the `public.users` table without modifying data.

The Express app, feature route registrations, middleware, and listener are separated under `src/app.ts`, `src/modules/`, `src/middleware/`, and `src/server.ts`. The root `server.ts` remains as a compatibility entry point.

Dashboard handlers reuse the role and identity already verified by authentication middleware rather than repeating account lookups. Repair list/detail/quote reads also use the authenticated actor for access decisions. Manager dashboard diagnosis lookup uses PostgreSQL `DISTINCT ON` to return only the newest diagnosis update per request instead of transferring the full diagnosis history. Requests lasting at least one second and admin dashboard summary queries lasting at least one second are logged as warnings. Query-plan-dependent indexing, pool tuning, broad pagination, and caching remain measurement-gated.

Run `npm test` for the automated authentication, public/protected route, role-policy, identity-scope, and repair-status regression tests. These tests do not exercise database-backed workflow transitions, transaction rollback, or persisted notification/payment/rating behavior. Run those against a dedicated isolated test database before treating the full workflow regression phase as complete; neither a test nor staging database URL is configured in the current environment.
