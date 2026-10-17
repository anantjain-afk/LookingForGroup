# Launch validation — 2026-10-18

The code is implemented across stacked feature branches and tested locally. It has not been deployed to production by this session. The production database has not been migrated or modified. The final invented name is intentionally undecided.

## Automated results

- Backend: nine integration/unit test groups pass against a guarded, disposable local PostgreSQL database. These cover password login, Google provider-boundary verification, explicit linking proof, password-free Google accounts, verification/reset single use and expiry, session expiry/revocation, CSRF, safe user responses, online eligibility, mobile ports, reviewed shutdowns, input escaping, caching/deduplication, pagination, concurrent IGDB upserts, favorite and lobby relationships, atomic last-slot joins, forged socket authentication, server-derived chat identity, host permissions, private credentials, kicking/bans, multi-tab membership, reconnect expiry, frontend proxy forwarding, and rate-limit separation behind a proxy.
- Load: 50 authenticated Socket.IO clients joined seven rooms (six rooms of eight, one of two), exchanged room-scoped chat, updated ready state, and restored five dropped connections without losing or duplicating slots. This is a short local burst test, not a Render capacity or long-running soak result. Voice/media load is not included.
- Chromium: five browser tests pass. Public browsing, actual sorting/filter URLs, IGDB links, API failure/retry, mobile overflow, authenticated chat, private game details, ready state, opt-in microphone behavior, two-way WebRTC negotiation with fake audio devices, mute/leave voice, reconnect, denied microphone fallback, and host-game preselection are covered. Chromium runs with the third-party-cookie phaseout switch. Tests use same-origin HTTP through a local proxy and ticket-authenticated direct sockets.
- Client lint and production build pass. Route splitting keeps the initial app bundle around 309 KB uncompressed; the voice/lobby code loads on demand.
- Migration chain passes on a fresh local schema and a populated copy of the original schema. The preserved fixture account, game, and favorite relationship remain; Prisma reports no schema drift for either database. This is not a validation of the current live Neon schema. Audit a Neon branch before production migration.
- Dependency patches remove all backend audit advisories and all frontend production dependency advisories. The frontend development polyfill toolchain still reports six low-severity transitive advisories; no forced major downgrade was applied. Recheck advisories before deployment.

Provider-boundary tests use a fake Google verifier, fake email transport, and fixture ICE configuration. They do not validate real Google consent settings, email deliverability, or TURN relay allocation. Mobile testing is Chromium viewport/touch emulation, not an iOS/Safari or physical Android device result.

## Repeat locally

Use Node 22 or 24 and PostgreSQL. Create separate local databases `lfg_test` and `lfg_test_browser`; do not point tests at Neon or any shared data.

```sh
# From server
TEST_DATABASE_URL=postgresql://user@127.0.0.1:5432/lfg_test npm test
# From client
npm run lint
npm run build
npx playwright install chromium --only-shell
LFG_E2E_DATABASE_URL=postgresql://user@127.0.0.1:5432/lfg_test_browser npm run test:e2e
```

The PR workflow runs these checks with a temporary PostgreSQL service. Browser fixtures exist only in `server/test`; the production entrypoint never registers their routes. Test scripts refuse non-local/non-test database names.

## Live checks before the Reddit post

1. Follow [provider setup](PROVIDER_SETUP.md), set Render/Vercel environment values, and verify the final deployment origin. Add the eventual app name to Google consent branding and app metadata when chosen.
2. Create a Neon branch/backup, inspect migration history and schema drift, deploy migrations there, and compare account/favorite/lobby counts and relationships. Review legacy game mappings and refresh eligible metadata. Existing unresolved favorites stay stored but are hidden until their metadata is reviewed. Promote the verified migration process to production before the corresponding server deploy.
3. Test actual Google login with a new account, password-account linking, Gmail/Outlook verification and reset, logout across tabs, expired/reset links, and blocked third-party cookies on the public URL.
4. Let the free Render instance sleep, then test public browsing, sign-in, socket reconnect, and error recovery while it wakes. Do not treat a wake-up failure as logout. In-memory chat history is bounded to 100 messages per lobby and resets on a backend restart; membership survives in PostgreSQL with a reconnect grace period.
5. Test physical Android Chrome and iOS Safari, Wi-Fi/cellular switching, microphone denial, autoplay restrictions, and reconnecting. Run a two-network forced-TURN QA build and confirm relay candidate pairs. Monitor the free relay usage cap. Eight-person mesh voice requires seven peer connections per user; local 50-socket testing does not prove eight-person mobile voice performance.
6. Repeat 50-client validation against staging with deployment limits and real network latency. Check Render/Neon latency and error logs without enabling paid overages. Collect feedback through the app's feedback link. Launch only after the live auth/email/relay checks pass.

## Branches

Each branch contains its predecessors; review/merge in this order, or review the final branch as the complete upgrade:

| Branch | Milestone commit |
| --- | --- |
| `feature/launch-foundation` | `3fb28fb` |
| `feature/authentication` | `b3b8555` |
| `feature/online-game-catalog` | `2a13ac4` |
| `feature/browse-games` | `ea3c738` |
| `feature/lobby-reliability` | `2b0d865` |
| `feature/launch-validation` | Final checks, documentation, dependency patches, and browser fixes |
