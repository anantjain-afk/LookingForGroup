# LFG

Find teammates for online games, browse lobbies by region, chat, and ready up. The final app name is still to be selected.

React/Vite on Vercel, Express/Socket.IO on one Render instance, and PostgreSQL/Prisma on Neon. Redis is optional; presence and voice signaling currently require one backend instance.

## Run locally

1. Run `npm ci` in both `server` and `client`.
2. Copy each `.env.example` to an ignored environment file. Use a **local disposable database** when developing. Set `JWT_SECRET` to at least 32 random characters and configure IGDB/Twitch credentials.
3. In `server`, run `npm run db:generate`, inspect `npm run db:audit`, then apply migrations with `npm run db:migrate` to your local database. Migrations add the default lobby tags without replacing existing tags or their lobby links. Run `npm run db:migrate` again when updating an existing deployment. See deployment notes before using an existing database.
4. Run `npm run dev` in each directory. Frontend: `http://localhost:5173`; backend: `http://localhost:3000`.

Browsing is public. Hosting and joining require a verified account. Google uses a Web OAuth client with JavaScript origins, a popup ID token, and server-side verification. Email verification/reset and TURN relay setup are in [provider setup](docs/PROVIDER_SETUP.md).

## Game identity

IGDB IDs identify games in public API responses and routes. A unique `Game.igdbId` maps to an internal database key used by favorites and lobby foreign keys. The first favorite or lobby lazily upserts that game; browsing does not import the catalog. Lobby queries resolve the public IGDB ID to the stored relationship. Separate internal keys preserve existing data and allow explicit legacy reconciliation.

Online eligibility requires explicit online metadata or a reviewed exception. Lobbies are no longer filtered or created by platform; players coordinate game and cross-play compatibility themselves. Reviewed categories and service shutdown corrections live in `server/src/config/game-catalog.js`.

## Validate and deploy

- [Deployment and migration guide](docs/DEPLOYMENT.md)
- [Provider setup](docs/PROVIDER_SETUP.md)
- [Launch validation results and remaining live checks](docs/LAUNCH_VALIDATION.md)

Run backend tests with `TEST_DATABASE_URL=postgresql://user@127.0.0.1:5432/lfg_test npm test` from `server`. The runner refuses remote or non-test databases. From `client`, run `npm run lint`, `npm run build`, and `npm run test:e2e`. To include authenticated realtime/voice browser tests, create a separate local `lfg_test_browser` database and set `LFG_E2E_DATABASE_URL` when running the browser suite. Install Chromium with `npx playwright install chromium --only-shell` first.

Each feature branch is based on the preceding milestone. The final `feature/launch-validation` branch contains the entire upgrade. Production migration, deployment configuration, provider credentials, and the final name must be reviewed before the Reddit post.
