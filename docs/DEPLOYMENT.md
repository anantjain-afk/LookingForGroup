# Launch deployment

The supplied Vercel deployment URL redirects to Vercel sign-in. Confirm the stable public Production domain in Vercel before publishing. The backend host could not be established from that protected deployment. `render.yaml` provides the intended single-process free backend configuration; do not create a duplicate if a Render service already exists.

Keep the frontend on Vercel and the database on Neon. The Render service runs from `server`, listens on `$PORT`, and exposes `/health`. Redis is disabled by default; enable it only when an actual shared Redis endpoint is configured. A localhost REDIS_URL alone does not enable it.

## Preserve the existing database

The original migration contains only User. The reconciliation migration adds the formerly untracked tables and constraints using conditional DDL, preserving existing rows. It is compatible with an empty database and the original complete Prisma schema. It is not a substitute for checking unexpected schema drift.

1. Back up or create a Neon branch of the existing database.
2. Point DATABASE_URL to that isolated branch, run `npm run db:audit`, and inspect migration history.
3. Run `npx prisma migrate status`. If the original migration was already applied, retain its history. If tables exist without migration history, verify that the original User table matches the migration before marking **only that migration** applied with `npx prisma migrate resolve --applied 20260120104122_user_model`.
4. Run `npx prisma migrate deploy` against the isolated branch. Verify account, favorite and lobby counts and foreign keys before repeating against production.
5. Never run `migrate reset`, `db push --accept-data-loss`, or the old destructive seed script against production.

Production migrations are deliberately separate from the Render build/start command. Test and apply them before deploying the corresponding application version.

## Free hosting

Render can sleep when idle. Treat wake-up failures as recoverable network errors, not logout. Keep quotas and delivery/voice configuration under review. Do not enable paid overages without a separate decision.

## Milestone branches

Each launch milestone is committed on a separate feature branch based on the previous milestone. Review and merge them in order, or use the final branch to review the complete upgrade. Branding remains intentionally unchanged until a name is selected.
