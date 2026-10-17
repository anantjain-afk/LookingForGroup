// Local-only browser test server. Never started by the production entrypoint.
import { spawnSync } from "node:child_process";
const url = process.env.LFG_E2E_DATABASE_URL;
if (
  !url ||
  !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.startsWith("/lfg_test")
)
  throw new Error(
    "Browser tests require a disposable local lfg_test database.",
  );
Object.assign(process.env, {
  DATABASE_URL: url,
  NODE_ENV: "test",
  JWT_SECRET: "browser-tests-only-secret-with-at-least-32-characters",
  CLIENT_URL: "http://127.0.0.1:5179",
  REDIS_ENABLED: "false",
});
const migrated = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: new URL("..", import.meta.url),
  env: process.env,
  stdio: "inherit",
});
if (migrated.status) process.exit(migrated.status);
const { start, clearDatabase, prisma } = await import("./helpers.js");
const { catalog, identity } = await import("./lobby-fixtures.js");
await clearDatabase();
const runtime = await start({
  catalog: catalog(),
  sendMail: async () => {},
  iceProvider: async () => [{ urls: "stun:127.0.0.1:9" }],
});
// The fixture binds a separate fixed port for Vite and WebSocket connections.
await new Promise((resolve) => runtime.httpServer.close(resolve));
await new Promise((resolve) =>
  runtime.httpServer.listen(3219, "127.0.0.1", resolve),
);
const people = await Promise.all(
  Array.from({ length: 4 }, (_, i) =>
    identity("http://127.0.0.1:3219", i + 1000),
  ),
);
// helpers use the regular development Origin; create directly for this fixture.
const { createLobby } = await import("../src/services/lobby.service.js");
const lobby = await createLobby(
  {
    igdbId: 126459,
    title: "Browser test squad",
    platformId: 6,
    region: "Asia",
    language: "English",
    maxPlayers: 8,
  },
  people[0].user.id,
  catalog(),
);
runtime.app.get("/__fixture/:index", (req, res) => {
  const person = people[Number(req.params.index)];
  if (!person) return res.sendStatus(404);
  res.json({
    lobbyId: lobby.id,
    user: person.user,
    cookie: person.client.cookies.get("session"),
  });
});
console.info("Browser fixture ready on 3219");
async function stop() {
  await runtime.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
