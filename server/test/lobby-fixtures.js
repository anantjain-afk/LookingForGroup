import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { browser, prisma } from "./helpers.js";
import { signToken } from "../src/services/session.service.js";
import { GameCatalog } from "../src/services/igdb.service.js";
export const rawGame = {
  id: 126459,
  name: "VALORANT",
  game_type: 0,
  first_release_date: 1600000000,
  platforms: [{ id: 6, name: "PC" }],
  genres: [{ id: 5, name: "Shooter" }],
  multiplayer_modes: [{ platform: 6, onlinemax: 10 }],
};
export const catalog = () =>
  new GameCatalog({ request: async () => [rawGame] });
export async function identity(base, index) {
  const user = await prisma.user.create({
    data: {
      email: `player${index}@example.com`,
      username: `Player${index}`,
      emailVerifiedAt: new Date(),
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 3600000) },
  });
  const client = browser(base);
  client.cookies.set(
    "session",
    signToken({ sid: session.id }, "session", "1h"),
  );
  return {
    user,
    session,
    client,
    ticket: () => signToken({ sid: session.id }, "socket", "60s"),
  };
}
export async function connect(base, identity) {
  const socket = io(base, {
    autoConnect: false,
    reconnection: false,
    transports: ["websocket"],
    auth: { ticket: identity.ticket() },
  });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", (error) => {
      socket.disconnect();
      reject(error);
    });
    socket.connect();
  });
  return socket;
}
export const action = (socket, event, payload = {}) =>
  socket.timeout(5000).emitWithAck(event, payload);
export async function eventually(check, timeout = 2500) {
  const end = Date.now() + timeout;
  let result;
  while (Date.now() < end) {
    result = await check();
    if (result) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(result, "Expected condition did not become true");
}
export async function room(person, extra = {}) {
  const response = await person.client.call("/api/lobbies", {
    method: "POST",
    body: {
      igdbId: 126459,
      title: "Our online squad",
      platformId: 6,
      region: "Asia",
      language: "English",
      ...extra,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
}
