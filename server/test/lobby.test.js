import test from "node:test";
import assert from "node:assert/strict";
import { start, clearDatabase, prisma } from "./helpers.js";
import {
  catalog,
  identity,
  connect,
  action,
  eventually,
  room,
} from "./lobby-fixtures.js";

test("lobby joins are atomic, identities verified, and private state protected through kicks and logout", async () => {
  await clearDatabase();
  const runtime = await start({ catalog: catalog() });
  const sockets = [];
  try {
    const people = await Promise.all(
      Array.from({ length: 5 }, (_, i) => identity(runtime.base, i)),
    );
    const [host, a, b, outsider] = people;
    const lobby = await room(host, { maxPlayers: 2 });
    await assert.rejects(()=>connect(runtime.base,{ticket:()=>"forged-ticket"}));
    assert.equal(
      (
        await host.client.call("/api/lobbies", {
          method: "POST",
          body: {
            igdbId: 126459,
            title: "Invalid room",
            maxPlayers: 9,
            region: "Asia",
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await host.client.call("/api/lobbies", {
          method: "POST",
          body: { igdbId: 126459, title: "No region" },
        })
      ).status,
      400,
    );
    const connected = await Promise.all(
      people.map((person) => connect(runtime.base, person)),
    );
    sockets.push(...connected);
    const [hs, as, bs, os] = connected;
    assert.equal(
      (
        await action(hs, "join_lobby", {
          lobbyId: lobby.id,
          userId: outsider.user.id,
        })
      ).ok,
      true,
    );
    const attempts = await Promise.all([
      action(as, "join_lobby", { lobbyId: lobby.id }),
      action(bs, "join_lobby", { lobbyId: lobby.id }),
    ]);
    assert.equal(attempts.filter((result) => result.ok).length, 1);
    assert.equal(
      await prisma.lobbyParticipant.count({ where: { lobbyId: lobby.id } }),
      2,
    );
    const member = attempts[0].ok ? as : bs;
    const person = attempts[0].ok ? a : b;
    assert.equal(
      (await action(member, "join_lobby", { lobbyId: lobby.id })).ok,
      true,
    );
    assert.equal(
      (
        await action(os, "send_message", {
          message: "spoof",
          userId: host.user.id,
          lobbyId: lobby.id,
        })
      ).error.code,
      "NOT_A_MEMBER",
    );
    assert.equal(
      (await action(member, "update_credentials", { credentials: "stolen" }))
        .error.code,
      "HOST_REQUIRED",
    );
    assert.equal(
      (await action(member, "kick_player", { targetUserId: host.user.id }))
        .error.code,
      "HOST_REQUIRED",
    );
    assert.equal(
      (await action(hs, "update_credentials", { credentials: "room-secret" }))
        .ok,
      true,
    );
    const state = await action(member, "join_lobby", { lobbyId: lobby.id });
    assert.equal(state.lobby.credentials, "room-secret");
    for (const path of [
      `/api/lobbies/${lobby.id}`,
      "/api/lobbies",
      "/api/games/126459/lobbies",
    ]) {
      const response = await outsider.client.call(path);
      assert.equal(response.status, 200);
      assert.equal(
        JSON.stringify(response.body).includes("room-secret"),
        false,
      );
    }
    assert.equal(
      (await outsider.client.call(`/api/lobbies/${lobby.id}/ice`)).status,
      403,
    );
    assert.equal(
      (await person.client.call(`/api/lobbies/${lobby.id}/ice`)).status,
      503,
    );
    const message = new Promise((resolve) => hs.once("new_message", resolve));
    assert.equal(
      (
        await action(member, "send_message", {
          message: "Hello squad",
          userId: host.user.id,
          user: { username: "Fake" },
        })
      ).ok,
      true,
    );
    assert.equal((await message).user.id, person.user.id);
    assert.equal((await action(member, "toggle_ready")).ok, true);
    assert.equal(
      (
        await prisma.lobbyParticipant.findUnique({
          where: {
            userId_lobbyId: { userId: person.user.id, lobbyId: lobby.id },
          },
        })
      ).isReady,
      true,
    );
    assert.equal(
      (
        await action(member, "signal_voice", {
          targetId: host.user.id,
          signalData: { type: "offer", sdp: "x" },
        })
      ).error.code,
      "VOICE_NOT_A_MEMBER",
    );
    await action(hs, "voice_join");
    await action(member, "voice_join");
    const signal = new Promise((resolve) => hs.once("signal_voice", resolve));
    assert.equal(
      (
        await action(member, "signal_voice", {
          targetId: host.user.id,
          senderId: outsider.user.id,
          signalData: { type: "offer", sdp: "x" },
        })
      ).ok,
      true,
    );
    assert.equal((await signal).senderId, person.user.id);
    const kicked = new Promise((resolve) =>
      member.once("player_kicked", resolve),
    );
    assert.equal(
      (await action(hs, "kick_player", { targetUserId: person.user.id })).ok,
      true,
    );
    await kicked;
    assert.equal(
      (await action(member, "join_lobby", { lobbyId: lobby.id })).error.code,
      "LOBBY_BANNED",
    );
    assert.equal(
      (await action(member, "send_message", { message: "still here" })).error
        .code,
      "NOT_A_MEMBER",
    );
    assert.equal(
      (await person.client.call(`/api/lobbies/${lobby.id}/ice`)).status,
      403,
    );
    let leaked = false;
    member.on("lobby_updated", () => {
      leaked = true;
    });
    await action(hs, "update_credentials", { credentials: "new-secret" });
    assert.equal(leaked, false);
    assert.equal(
      (await outsider.client.call("/api/lobbies?region=Europe")).body.length,
      0,
    );
    assert.equal(
      (
        await outsider.client.call(
          "/api/lobbies?platformId=6&region=Asia&language=english",
        )
      ).body.length,
      1,
    );
    await host.client.call("/api/auth/logout", { method: "POST" });
    await eventually(() => !hs.connected);
    await assert.rejects(() => connect(runtime.base, host));
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    await runtime.close();
    await prisma.$disconnect();
  }
});

test("multiple tabs retain one slot, reconnect restores it, and abandoned hosts leave rooms open", async () => {
  await clearDatabase();
  const runtime = await start({ catalog: catalog(), reconnectGraceMs: 250 });
  const sockets = [];
  try {
    const host = await identity(runtime.base, 20),
      member = await identity(runtime.base, 21);
    const lobby = await room(host);
    const hs = await connect(runtime.base, host),
      one = await connect(runtime.base, member),
      two = await connect(runtime.base, member);
    sockets.push(hs, one, two);
    for (const socket of sockets)
      assert.equal(
        (await action(socket, "join_lobby", { lobbyId: lobby.id })).ok,
        true,
      );
    assert.equal(
      await prisma.lobbyParticipant.count({ where: { lobbyId: lobby.id } }),
      2,
    );
    await action(one, "voice_join");
    assert.equal(
      (await action(two, "voice_join")).error.code,
      "VOICE_OTHER_TAB",
    );
    one.disconnect();
    await eventually(
      () =>
        runtime.realtime.presence.get(
          runtime.realtime.key(lobby.id, member.user.id),
        )?.size === 1,
    );
    assert.equal(
      (
        await prisma.lobbyParticipant.findUnique({
          where: {
            userId_lobbyId: { userId: member.user.id, lobbyId: lobby.id },
          },
        })
      ).disconnectedAt,
      null,
    );
    two.disconnect();
    await eventually(async () =>
      Boolean(
        (
          await prisma.lobbyParticipant.findUnique({
            where: {
              userId_lobbyId: { userId: member.user.id, lobbyId: lobby.id },
            },
          })
        )?.disconnectedAt,
      ),
    );
    const restored = await connect(runtime.base, member);
    sockets.push(restored);
    assert.equal(
      (await action(restored, "join_lobby", { lobbyId: lobby.id })).ok,
      true,
    );
    assert.equal(
      (
        await prisma.lobbyParticipant.findUnique({
          where: {
            userId_lobbyId: { userId: member.user.id, lobbyId: lobby.id },
          },
        })
      ).disconnectedAt,
      null,
    );
    hs.disconnect();
    await eventually(
      async () =>
        !(await prisma.lobbyParticipant.findUnique({
          where: {
            userId_lobbyId: { userId: host.user.id, lobbyId: lobby.id },
          },
        })),
    );
    assert.equal(
      (await prisma.lobby.findUnique({ where: { id: lobby.id } })).status,
      "OPEN",
    );
    assert.equal(
      await prisma.lobbyParticipant.count({ where: { lobbyId: lobby.id } }),
      1,
    );
    assert.equal(
      (await action(restored, "join_lobby", { lobbyId: lobby.id })).ok,
      true,
    );
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    await runtime.close();
    await prisma.$disconnect();
  }
});
