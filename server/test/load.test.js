import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { start, clearDatabase, prisma } from "./helpers.js";
import {
  catalog,
  identity,
  connect,
  action,
  eventually,
  room,
} from "./lobby-fixtures.js";

test("50 authenticated connections in seven rooms preserve capacity, broadcast chat, and recover connections", async () => {
  await clearDatabase();
  const runtime = await start({ catalog: catalog() });
  const sockets = [];
  try {
    const people = await Promise.all(
      Array.from({ length: 50 }, (_, i) => identity(runtime.base, i + 100)),
    );
    const rooms = [];
    for (let i = 0; i < 7; i++)
      rooms.push(
        await room(people[i * 8], {
          maxPlayers: 8,
          title: `Launch squad ${i + 1}`,
        }),
      );
    const started = performance.now();
    sockets.push(
      ...(await Promise.all(
        people.map((person) => connect(runtime.base, person)),
      )),
    );
    const joins = await Promise.all(
      sockets.map((socket, i) =>
        action(socket, "join_lobby", { lobbyId: rooms[Math.floor(i / 8)].id }),
      ),
    );
    assert.equal(joins.filter((result) => result.ok).length, 50);
    assert.equal(runtime.io.engine.clientsCount, 50);
    for (let i = 0; i < 7; i++)
      assert.equal(
        await prisma.lobbyParticipant.count({
          where: { lobbyId: rooms[i].id },
        }),
        i === 6 ? 2 : 8,
      );
    assert.equal(
      (await action(sockets[49], "join_lobby", { lobbyId: rooms[0].id })).error
        .code,
      "ALREADY_IN_LOBBY",
    );
    const received = Array(50).fill(0);
    sockets.forEach((socket, i) =>
      socket.on("new_message", () => received[i]++),
    );
    await Promise.all(
      sockets.map((socket, i) =>
        action(socket, "send_message", { message: `Hello from player ${i}` }),
      ),
    );
    await eventually(() =>
      received.every((count, i) => count === (i >= 48 ? 2 : 8)),
    );
    const ready = await Promise.all(
      sockets.map((socket) => action(socket, "toggle_ready")),
    );
    assert.ok(ready.every((result) => result.ok));
    assert.equal(
      await prisma.lobbyParticipant.count({ where: { isReady: true } }),
      50,
    );
    for (const i of [3, 11, 19, 27, 35]) sockets[i].disconnect();
    for (const i of [3, 11, 19, 27, 35]) {
      sockets[i] = await connect(runtime.base, people[i]);
      assert.equal(
        (
          await action(sockets[i], "join_lobby", {
            lobbyId: rooms[Math.floor(i / 8)].id,
          })
        ).ok,
        true,
      );
    }
    assert.equal(await prisma.lobbyParticipant.count(), 50);
    assert.equal(runtime.io.engine.clientsCount, 50);
    console.info(
      JSON.stringify({
        event: "local_load_result",
        connections: 50,
        rooms: 7,
        maxRoomSize: 8,
        elapsedMs: Math.round(performance.now() - started),
      }),
    );
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    await runtime.close();
    await prisma.$disconnect();
  }
});
