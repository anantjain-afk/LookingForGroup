import { randomUUID } from "node:crypto";
import { z } from "zod";
import * as lobbies from "../services/lobby.service.js";
import { findSession } from "../services/session.service.js";
import { AppError, parse } from "../lib/errors.js";
import { RECONNECT_GRACE_MS } from "../config/lobbies.js";

const id = z.string().min(1).max(64);
export class LobbyRealtime {
  constructor(io, { graceMs = RECONNECT_GRACE_MS } = {}) {
    this.io = io;
    this.graceMs = graceMs;
    this.presence = new Map();
    this.timers = new Map();
    this.voices = new Map();
    this.messages = new Map();
    this.rates = new Map();
    this.stopped = false;
    this.departures = new Set();
  }
  key(lobbyId, userId) {
    return `${lobbyId}:${userId}`;
  }
  room(lobbyId) {
    return `lobby_${lobbyId}`;
  }
  async broadcast(lobbyId) {
    const sockets = await this.io.in(this.room(lobbyId)).fetchSockets();
    const publicState = await lobbies.getLobbyById(lobbyId);
    const allowed = sockets.filter((socket) =>
      publicState?.participants.some((p) => p.userId === socket.data.userId),
    );
    const state = allowed.length
      ? await lobbies.getLobbyById(lobbyId, allowed[0].data.userId)
      : publicState;
    if (state && allowed.length)
      this.io
        .to(allowed.map((socket) => socket.id))
        .emit("lobby_updated", state);
    this.io.emit("lobbies_changed", { igdbId: state?.game?.igdbId });
  }
  voiceMembers(lobbyId) {
    return [...(this.voices.get(lobbyId)?.keys() || [])];
  }
  publishVoice(lobbyId) {
    this.io
      .to(this.room(lobbyId))
      .emit("voice_members", this.voiceMembers(lobbyId));
  }
  cancelTimer(key) {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }
  attach(socket, lobbyId) {
    const key = this.key(lobbyId, socket.data.userId);
    this.cancelTimer(key);
    if (!this.presence.has(key)) this.presence.set(key, new Set());
    this.presence.get(key).add(socket.id);
    socket.data.lobbyId = lobbyId;
  }
  dropVoice(socket, lobbyId = socket.data.lobbyId) {
    const members = this.voices.get(lobbyId);
    if (members?.get(socket.data.userId) === socket.id) {
      members.delete(socket.data.userId);
      this.publishVoice(lobbyId);
    }
    if (members?.size === 0) this.voices.delete(lobbyId);
  }
  async evict(lobbyId, userId, event = "lobby_left") {
    const key = this.key(lobbyId, userId);
    this.cancelTimer(key);
    this.presence.delete(key);
    for (const socket of await this.io.in(this.room(lobbyId)).fetchSockets())
      if (socket.data.userId === userId) {
        this.dropVoice(socket, lobbyId);
        socket.emit(event, { userId });
        socket.data.lobbyId = null;
        await socket.leave(this.room(lobbyId));
      }
  }
  async closed(lobbyId, igdbId) {
    const sockets = await this.io.in(this.room(lobbyId)).fetchSockets();
    for (const socket of sockets) {
      const key = this.key(lobbyId, socket.data.userId);
      this.cancelTimer(key);
      this.presence.delete(key);
      socket.data.lobbyId = null;
    }
    this.io.to(this.room(lobbyId)).emit("LOBBY_DISBANDED");
    this.io.in(this.room(lobbyId)).socketsLeave(this.room(lobbyId));
    this.voices.delete(lobbyId);
    this.messages.delete(lobbyId);
    this.io.emit("lobbies_changed", { igdbId });
  }
  async depart(socket) {
    if (this.stopped) return;
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) return;
    const userId = socket.data.userId;
    const key = this.key(lobbyId, userId);
    this.dropVoice(socket, lobbyId);
    const peers = this.presence.get(key);
    peers?.delete(socket.id);
    if (peers?.size) return;
    this.presence.delete(key);
    await lobbies.markDisconnected(lobbyId, userId);
    if (this.stopped) return;
    // A reconnect may have happened during the database update.
    if (this.presence.has(key)) {
      await lobbies.joinLobby(lobbyId, userId);
      return;
    }
    await this.broadcast(lobbyId);
    this.cancelTimer(key);
    const timer = setTimeout(
      () =>
        this.expire(lobbyId, userId).catch(() =>
          console.error(JSON.stringify({ event: "departure_cleanup_failed" })),
        ),
      this.graceMs + 10,
    );
    timer.unref();
    this.timers.set(key, timer);
  }
  async expire(lobbyId, userId) {
    const key = this.key(lobbyId, userId);
    if (this.presence.get(key)?.size) return;
    const result = await lobbies.expireDeparture(
      lobbyId,
      userId,
      new Date(Date.now() - this.graceMs),
    );
    this.cancelTimer(key);
    if (result?.closed) await this.closed(lobbyId, result.igdbId);
    else if (result) {
      await this.evict(lobbyId, userId);
      await this.broadcast(lobbyId);
    }
  }
  async stop() {
    this.stopped = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    await Promise.allSettled([...this.departures]);
    this.presence.clear();
    this.voices.clear();
    this.messages.clear();
    this.rates.clear();
  }
  limited(userId, event) {
    const key = `${userId}:${event}`;
    const now = Date.now();
    let rate = this.rates.get(key);
    if (!rate || rate.until < now) {
      rate = { count: 0, until: now + 10000 };
      this.rates.set(key, rate);
    }
    const limit =
      event === "signal_voice" ? 100 : event === "send_message" ? 15 : 20;
    if (++rate.count > limit)
      throw new AppError(
        429,
        "Slow down for a moment, then try again.",
        "RATE_LIMITED",
      );
    if (this.rates.size > 2000)
      for (const [k, v] of this.rates) if (v.until < now) this.rates.delete(k);
  }
  bind(socket) {
    const on = (event, schema, handler) =>
      socket.on(event, (payload = {}, ack) => {
        const run = async () => {
          try {
            this.limited(socket.data.userId, event);
            const data = parse(schema, payload);
            const session = await findSession(socket.data.sessionId);
            socket.data.user = session.user;
            if (!session.user.emailVerifiedAt)
              throw new AppError(
                403,
                "Verify your email before joining a lobby.",
                "EMAIL_UNVERIFIED",
              );
            const result = await handler(data);
            if (typeof ack === "function") ack({ ok: true, ...result });
          } catch (error) {
            const detail = {
              message: error.status
                ? error.message
                : "The action could not be completed. Please retry.",
              code: error.code || "LOBBY_ERROR",
            };
            if (typeof ack === "function") ack({ ok: false, error: detail });
            else socket.emit("lobby_error", detail);
            console.info(
              JSON.stringify({
                event: "socket_action_failed",
                action: event,
                code: detail.code,
              }),
            );
          }
        };
        // Preserve event order across async session/database checks, particularly SDP
        // offers and their following ICE candidates.
        socket.data.actionQueue = (
          socket.data.actionQueue || Promise.resolve()
        ).then(run, run);
      });
    const member = async () => {
      if (!socket.data.lobbyId)
        throw new AppError(403, "Join a lobby first.", "NOT_A_MEMBER");
      await lobbies.assertMember(socket.data.lobbyId, socket.data.userId);
      return socket.data.lobbyId;
    };
    on("join_lobby", z.object({ lobbyId: id }), async ({ lobbyId }) => {
      if (socket.data.joining)
        throw new AppError(
          409,
          "A lobby join is already in progress.",
          "JOIN_PENDING",
        );
      if (socket.data.lobbyId && socket.data.lobbyId !== lobbyId)
        throw new AppError(
          409,
          "Leave your current lobby first.",
          "ALREADY_IN_LOBBY",
        );
      socket.data.joining = true;
      try {
        const lobby = await lobbies.joinLobby(lobbyId, socket.data.userId);
        this.attach(socket, lobbyId);
        if (!socket.connected) {
          await this.depart(socket);
          return {};
        }
        await socket.join(this.room(lobbyId));
        socket.emit("lobby_joined", lobby);
        socket.emit("voice_members", this.voiceMembers(lobbyId));
        await this.broadcast(lobbyId);
        return { lobby, messages: this.messages.get(lobbyId) || [] };
      } finally {
        socket.data.joining = false;
      }
    });
    on("leave_lobby", z.object({}), async () => {
      const lobbyId = await member();
      const result = await lobbies.leaveLobby(lobbyId, socket.data.userId);
      if (result.closed) await this.closed(lobbyId, result.igdbId);
      else {
        await this.evict(lobbyId, socket.data.userId);
        await this.broadcast(lobbyId);
      }
    });
    on(
      "send_message",
      z.object({ message: z.string().trim().min(1).max(1000) }),
      async ({ message }) => {
        const lobbyId = await member();
        const { id, username, avatar } = socket.data.user;
        const entry = {
          id: randomUUID(),
          text: message,
          user: { id, username, avatar },
          timestamp: new Date().toISOString(),
        };
        const history = [...(this.messages.get(lobbyId) || []), entry].slice(
          -100,
        );
        this.messages.set(lobbyId, history);
        this.io.to(this.room(lobbyId)).emit("new_message", entry);
      },
    );
    on("toggle_ready", z.object({}), async () => {
      const lobbyId = await member();
      await lobbies.toggleReady(lobbyId, socket.data.userId);
      await this.broadcast(lobbyId);
    });
    on(
      "kick_player",
      z.object({ targetUserId: id }),
      async ({ targetUserId }) => {
        const lobbyId = await member();
        await lobbies.kickPlayer(lobbyId, socket.data.userId, targetUserId);
        await this.evict(lobbyId, targetUserId, "player_kicked");
        await this.broadcast(lobbyId);
      },
    );
    on(
      "update_credentials",
      z.object({ credentials: z.string().trim().max(2000) }),
      async ({ credentials }) => {
        const lobbyId = await member();
        await lobbies.updateCredentials(
          lobbyId,
          socket.data.userId,
          credentials,
        );
        await this.broadcast(lobbyId);
      },
    );
    on("voice_join", z.object({}), async () => {
      const lobbyId = await member();
      let members = this.voices.get(lobbyId);
      if (!members) {
        members = new Map();
        this.voices.set(lobbyId, members);
      }
      if (
        members.has(socket.data.userId) &&
        members.get(socket.data.userId) !== socket.id
      )
        throw new AppError(
          409,
          "Voice is already active in another tab.",
          "VOICE_OTHER_TAB",
        );
      if (!members.has(socket.data.userId) && members.size >= 8)
        throw new AppError(
          409,
          "Voice is full. You can still use text chat.",
          "VOICE_FULL",
        );
      members.set(socket.data.userId, socket.id);
      this.publishVoice(lobbyId);
      return { members: this.voiceMembers(lobbyId) };
    });
    on("voice_leave", z.object({}), async () => {
      const lobbyId = await member();
      this.dropVoice(socket, lobbyId);
    });
    on(
      "signal_voice",
      z.object({
        targetId: id,
        signalData: z
          .unknown()
          .refine(
            (value) => Boolean(value) && JSON.stringify(value).length < 16000,
            "Invalid voice signal.",
          ),
      }),
      async ({ targetId, signalData }) => {
        const lobbyId = await member();
        const voices = this.voices.get(lobbyId);
        if (
          voices?.get(socket.data.userId) !== socket.id ||
          !voices.has(targetId)
        )
          throw new AppError(
            403,
            "Voice signaling is limited to voice members of this lobby.",
            "VOICE_NOT_A_MEMBER",
          );
        await lobbies.assertMember(lobbyId, targetId);
        this.io
          .to(voices.get(targetId))
          .emit("signal_voice", { signalData, senderId: socket.data.userId });
      },
    );
    socket.on("disconnect", () => {
      const task = this.depart(socket).catch(() =>
        console.error(JSON.stringify({ event: "disconnect_cleanup_failed" })),
      );
      this.departures.add(task);
      task.finally(() => this.departures.delete(task));
    });
  }
}
