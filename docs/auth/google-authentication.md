# Google authentication (SCRUM-3)

Uses the shared SCRUM-8 login card on `/welcome-page`, `/login`, and `/register`.
The branch includes PR #17 as a dependency; merge that UI PR before merging this
work. Email/password registration and login remain with SCRUM-21.

## Local setup

1. Install dependencies in `backend` and `frontend` with `npm ci`.
2. Copy `backend/.env.example` to `backend/.env` and fill in the Google client ID
   and secret. Keep the secret on the backend, outside Git and browser code.
3. In Google Cloud, configure a **Web application** OAuth client with the exact
   redirect URI `http://localhost:3000/api/auth/google/callback`. Configure the
   consent screen and test users as applicable. Request only `openid email profile`.
4. Run `npm run migrate:up` in `backend`. This adds `oauth_accounts`, `sessions`,
   and short-lived `oauth_login_attempts` without changing existing migrations.
5. Start the backend on port 5001 and frontend on port 3000. Next.js proxies `/api`
   to Express, so redirects and cookies stay on the browser's frontend origin.

The app can start without Google credentials; the Google button then returns a
friendly unavailable message. Mocked tests do not require credentials. Live Google
sign-in must still be checked with a configured OAuth client and test account.

## Flow and security

- `GET /api/auth/google` saves a ten-minute login attempt and redirects to Google
  using state, PKCE S256, and an OpenID Connect nonce. An HttpOnly cookie binds the
  attempt to the browser. The database stores only the hash of the state token.
- `GET /api/auth/google/callback` consumes the attempt once, exchanges the code,
  and uses Google's official library to check the ID token's signature, issuer,
  audience, and expiry. The service checks the nonce and verified email.
- Returning users are identified by Google's `sub`, not by their email. New users
  and their Google account link are created atomically. Existing accounts with a
  matching email link automatically only when Google is authoritative for that
  verified email (`gmail.com` or a Workspace `hd` claim). Other existing-email
  matches return `ACCOUNT_LINK_REQUIRED` rather than risk account takeover. A
  future authenticated account-linking flow can handle these cases.
- Session tokens are 32 random bytes; only SHA-256 hashes are stored. Every sign-in
  replaces the browser's previous session. Google tokens are neither retained nor
  sent to the frontend. OAuth callback queries are excluded from HTTP logs.
- The `sid` cookie is HttpOnly, SameSite=Lax, Path=/, and Secure in production.
  Sessions slide for seven days while active and always expire after thirty days.
- `GET /api/auth/me` returns the safe user profile or `{ user: null }`, renews valid
  sessions, and never caches responses. Roles come from the current user record.
- `POST /api/auth/logout` deletes the session and clears its cookie. It rejects
  missing or unapproved Origin headers. CORS also uses `ALLOWED_ORIGINS` explicitly.
- Success returns to `/welcome-page`, which displays the signed-in user and logout.
  No dashboard route currently exists. Errors and cancellation return to the same
  page with an allowlisted error code, never Google error details or tokens.

For production set `NODE_ENV=production`, HTTPS redirect URI, `ALLOWED_ORIGINS`,
and the frontend's `BACKEND_URL` for the deployed backend; rebuild Next.js after
changing the proxy target. Configure Google with that exact HTTPS callback URL.
Use a persistent SQLite database shared across backend restarts.

## Validation

Run `npm test -- --runInBand` in `backend` and `npm run build` in `frontend`.
The auth integration tests exercise mocked Google responses, state/nonce/PKCE,
repeat login, account linking, session cookies/expiry, logout, and migration rollback.
Live local validation also passed with a configured Google client: account chooser,
consent, callback, signed-in profile after refresh, logout, and returning sign-in
from registration. The returning sign-in reused the same user and OAuth account.
The configured development client also allows port 3003; when using it, set the
callback, frontend proxy target, and backend origin allowlist consistently in local
environment files. Production domains and HTTPS remain deployment configuration.

References: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[ID token validation and email authority](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
and [Luis's proposed auth plan](https://github.com/techstartucalgary/Tech-Start-Hackathon-2026/pull/10).
