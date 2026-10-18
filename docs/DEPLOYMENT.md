# Launch deployment

Confirmed public frontend: https://looking-for-group.vercel.app. Its deployed JavaScript identifies https://lookingforgroup-a5cs.onrender.com as the existing backend. The earlier deployment-specific URL redirects to Vercel sign-in. Update the existing Render service rather than creating a duplicate; `render.yaml` documents its intended configuration.

Keep the frontend on Vercel and the database on Neon. The Render service runs from `server`, listens on `$PORT`, and exposes `/health`. Redis is disabled by default; enable it only when an actual shared Redis endpoint is configured. A localhost REDIS_URL alone does not enable it.

## Preserve the existing database

The original migration contains only User. The reconciliation migration adds the formerly untracked tables and constraints using conditional DDL, preserving existing rows. It is compatible with an empty database and the original complete Prisma schema. It is not a substitute for checking unexpected schema drift.

1. Back up or create a Neon branch of the existing database.
2. Point DATABASE_URL to that isolated branch, run `npm run db:audit`, and inspect migration history.
3. Run `npx prisma migrate status`. If the original migration was already applied, retain its history. If tables exist without migration history, verify that the original User table matches the migration before marking **only that migration** applied with `npx prisma migrate resolve --applied 20260120104122_user_model`.
4. Run `npx prisma migrate deploy` against the isolated branch. Verify account, favorite and lobby counts and foreign keys before repeating against production.
5. Never run `migrate reset`, `db push --accept-data-loss`, or the old destructive seed script against production.

Production migrations are deliberately separate from the Render build/start command. Test and apply them before deploying the corresponding application version. The `20261018000100_restore_default_tags` migration adds 29 default lobby tags with `ON CONFLICT (name) DO NOTHING`; it keeps existing tag IDs and lobby relationships. Run `npm run db:migrate` against the intended Neon database before deploying the tag-restoration branch.

## Authentication configuration

Set `PUBLIC_APP_URL` to the stable frontend origin and `CLIENT_URL` to the allowed frontend origins (comma-separated, no trailing slash). The backend refuses to start without a JWT_SECRET of at least 32 characters. Old seven-day JWT cookies are intentionally replaced by revocable sessions; existing users sign in again once.

Create a Google OAuth **Web application** client. Set GOOGLE_CLIENT_ID only on the backend; the public client ID is served by `/api/auth/config`. Add `http://localhost:5173` and the public production origin to Google's authorized JavaScript origins. No Google client secret is used. Test accounts with an existing email must log in by password and explicitly connect Google from their own profile.

Set BREVO_API_KEY, MAIL_FROM_EMAIL and MAIL_FROM_NAME on the backend after verifying the sender in Brevo. Use the free plan without enabling paid features. See [provider setup](PROVIDER_SETUP.md) for dashboard steps. Without email configuration, accounts can register but cannot verify/join; the resend action reports delivery unavailable. Test delivery to real Gmail and Outlook inboxes before launching password signup. Reset/verification links use URL fragments and are never logged by the application. Existing password users must verify their email before joining or hosting.

On Vercel, leave VITE_API_URL **unset** (remove any existing direct-backend value), set VITE_SOCKET_URL to the HTTPS Render origin, and set API_ORIGIN to the same origin. The frontend always uses its same-origin `/api` proxy for HTTP requests, including when a stale VITE_API_URL remains in the Vercel settings. The included API function proxies HTTP requests, preserving host-only cookies; `/api` rewrites must precede the SPA fallback. Socket.IO connects directly using a 60-second ticket tied to the revocable session. Test with third-party cookies blocked. Local Vite development also proxies `/api` to port 3000.

### Local integration tests

Create a disposable local PostgreSQL database named `lfg_test` and run `TEST_DATABASE_URL=postgresql://user@127.0.0.1:5432/lfg_test npm test` from server. The runner refuses non-local databases, applies migrations, and never falls back to DATABASE_URL. Tests replace Google verification and mail delivery at their provider boundaries. This does not verify real provider credentials or inbox delivery.

Render can sleep when idle. Treat wake-up failures as recoverable network errors, not logout. Keep quotas and delivery/voice configuration under review. Do not enable paid overages without a separate decision.

## Lobby runtime and relay

New lobbies require a server region, default to five players, and allow at most eight. Language is optional. Platform selection and platform lobby filtering have been removed; players coordinate cross-play compatibility themselves. Existing lobby platform values remain in the database for compatibility but are ignored by the current app. Atomic joins lock the lobby row, and membership is unique per user/lobby. A host can leave while keeping the lobby open; explicit close ends it for everyone. Lobbies remain in browse results for seven days after creation, including when empty. A lost connection reserves a place for 60 seconds, and another tab keeps the same membership active. Restart recovery marks existing memberships disconnected and allows the same grace period. Cleanup also removes explicitly closed rooms after 24 hours.

Keep one Render instance: presence, bounded chat history, grace timers, and voice membership are in memory. Enabling Redis alone does not make this presence implementation safe for multiple instances. Voice is opt-in and limited to one active tab per user per room. Metered configuration and quota/credential rotation steps are in [provider setup](PROVIDER_SETUP.md). Authenticated members receive relay ICE credentials; text chat continues when voice is unavailable.

## Game catalog maintenance

Public game endpoints return `{ games, nextOffset }`; individual games expose `igdbId`, never an overloaded local `id`. Lobby creation accepts `igdbId`. Only a favorite or lobby creates a new database Game row. Existing records may have their cached metadata refreshed on detail lookup.

`server/src/config/game-catalog.js` contains reviewed featured collections, online metadata exceptions and known shutdown exclusions, with source links. It is deliberately an editable reviewed catalog, not an automatic guarantee that every historical server is still live. A generic multiplayer/co-op tag is insufficient.

Run `npm run games:review -- --refresh` to inspect existing IGDB-linked records. Add `--apply` to persist refreshed metadata after checking the isolated database. Unresolved records remain stored but are hidden from new selections and favorite displays. Map them explicitly using `npm run games:review -- --map /path/to/reviewed.json` (dry-run), then add `--apply` after reviewing the output. The JSON is an array of `{ "localId": "existing-cuid", "igdbId": 126459 }`. A reviewed merge rewires existing favorites and lobbies transactionally; names are never matched automatically. Keep the source mapping with your deployment notes.

See [launch validation](LAUNCH_VALIDATION.md) for results, remaining production checks, and branch names.

Each launch milestone is committed on a separate feature branch based on the previous milestone. Review and merge them in order, or use the final branch to review the complete upgrade. Branding remains intentionally unchanged until a name is selected.
