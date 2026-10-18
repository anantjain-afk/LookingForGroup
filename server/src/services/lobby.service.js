import { z } from "zod";
import prisma from "../db/config.js";
import { resolveGame, storedGame } from "./game.service.js";
import { parseIgdbId } from "./igdb.service.js";
import { parse, AppError } from "../lib/errors.js";
import { REGIONS, CAPACITIES } from "../config/lobbies.js";
const person = { id: true, username: true, avatar: true };
const include = {
  game: true,
  host: { select: person },
  tags: { include: { tag: true } },
  participants: {
    include: { user: { select: person } },
    orderBy: { joinedAt: "asc" },
  },
};
function serialize(row, privateState = false) {
  if (!row) return null;
  const { credentials, participants, tags, game, ...lobby } = row;
  return {
    ...lobby,
    game: storedGame(game),
    tags: tags.map((item) => item.tag),
    participants: participants.map(({ disconnectedAt, ...p }) => ({
      ...p,
      online: disconnectedAt === null,
    })),
    ...(privateState ? { credentials } : {}),
  };
}
export async function getLobbyById(id, privateFor) {
  const lobby = await prisma.lobby.findUnique({ where: { id }, include });
  return serialize(
    lobby,
    Boolean(
      privateFor && lobby?.participants.some((p) => p.userId === privateFor),
    ),
  );
}
export async function createLobby(input, hostId, provider) {
  const data = parse(
    z
      .object({
        igdbId: z.number().int().positive(),
        title: z.string().trim().min(3).max(80),
        description: z.string().trim().max(1200).optional(),
        maxPlayers: z
          .number()
          .int()
          .refine((value) => CAPACITIES.includes(value), "Choose 2–8 players.")
          .default(5),
        platformId: z.number().int().positive().optional(),
        region: z.enum(REGIONS),
        language: z.string().trim().max(40).optional(),
        tags: z.array(z.string().min(1).max(64)).max(12).default([]),
      })
      .strict(),
    input,
  );
  const { local, game } = await resolveGame(data.igdbId, provider, true);
  const tags = [...new Set(data.tags)];
  if (
    tags.length &&
    (await prisma.tag.count({ where: { id: { in: tags } } })) !== tags.length
  )
    throw new AppError(
      400,
      "One or more lobby tags are invalid.",
      "VALIDATION_ERROR",
    );
  const lobby = await prisma.lobby.create({
    data: {
      title: data.title,
      description: data.description,
      maxPlayers: data.maxPlayers,
      region: data.region,
      language: data.language || null,
      hostId,
      gameId: local.id,
      tags: { create: tags.map((tagId) => ({ tagId })) },
      participants: {
        create: { userId: hostId, role: "HOST", disconnectedAt: new Date() },
      },
    },
    include,
  });
  return serialize(lobby, true);
}
export async function getAllLobbies(filters = {}) {
  const data = parse(
    z
      .object({
        igdbId: z.union([z.string(), z.number()]).optional(),
        tags: z.string().max(1000).optional(),
        platformId: z.coerce.number().int().positive().optional(),
        region: z.enum(REGIONS).optional(),
        language: z.string().trim().max(40).optional(),
      })
      .strict(),
    filters,
  );
  const where = {
    status: { in: ["OPEN", "FULL"] },
    game: { igdbId: { not: null } },
    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    ...(data.region ? { region: data.region } : {}),
    ...(data.language
      ? { language: { equals: data.language, mode: "insensitive" } }
      : {}),
  };
  if (data.igdbId) where.game = { igdbId: parseIgdbId(data.igdbId) };
  if (data.tags) {
    const tagIds = [...new Set(data.tags.split(","))];
    if (tagIds.length > 12 || tagIds.some((id) => !id || id.length > 64))
      throw new AppError(
        400,
        "Choose up to 12 valid lobby tags.",
        "VALIDATION_ERROR",
      );
    // Each selected tag must be on the same lobby.
    where.AND = tagIds.map((tagId) => ({ tags: { some: { tagId } } }));
  }
  const lobbies = await prisma.lobby.findMany({
    where,
    include,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return lobbies
    .filter((lobby) => storedGame(lobby.game))
    .map((lobby) => serialize(lobby));
}
async function locked(lobbyId, operation) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Lobby" WHERE id = ${lobbyId} FOR UPDATE`;
      const lobby = await tx.lobby.findUnique({
        where: { id: lobbyId },
        include: { participants: true, game: true },
      });
      if (!lobby)
        throw new AppError(404, "Lobby not found.", "LOBBY_NOT_FOUND");
      return operation(tx, lobby);
    },
    { maxWait: 10000, timeout: 10000 },
  );
}
function membership(lobby, userId) {
  const participant = lobby.participants.find((p) => p.userId === userId);
  if (lobby.status === "CLOSED" || !participant)
    throw new AppError(
      403,
      "You are not a member of this lobby.",
      "NOT_A_MEMBER",
    );
  return participant;
}
function host(lobby, userId) {
  if (lobby.hostId !== userId)
    throw new AppError(403, "Only the host can do that.", "HOST_REQUIRED");
}
async function close(tx, lobby) {
  await tx.lobbyParticipant.deleteMany({ where: { lobbyId: lobby.id } });
  await tx.lobby.update({
    where: { id: lobby.id },
    data: { status: "CLOSED", credentials: null },
  });
  return { closed: true, igdbId: lobby.game.igdbId };
}
async function remove(tx, lobby, userId) {
  await tx.lobbyParticipant.deleteMany({
    where: { lobbyId: lobby.id, userId },
  });
  const count = await tx.lobbyParticipant.count({
    where: { lobbyId: lobby.id },
  });
  await tx.lobby.update({
    where: { id: lobby.id },
    data: { status: count >= lobby.maxPlayers ? "FULL" : "OPEN" },
  });
  return { closed: false, igdbId: lobby.game.igdbId };
}
export async function joinLobby(lobbyId, userId) {
  await locked(lobbyId, async (tx, lobby) => {
    if (lobby.status === "CLOSED")
      throw new AppError(409, "This lobby has closed.", "LOBBY_CLOSED");
    if (!storedGame(lobby.game))
      throw new AppError(
        409,
        "This lobby’s game is awaiting catalog review.",
        "GAME_UNAVAILABLE",
      );
    if (
      await tx.lobbyBan.findUnique({
        where: { lobbyId_userId: { lobbyId, userId } },
      })
    )
      throw new AppError(
        403,
        "You were removed from this lobby.",
        "LOBBY_BANNED",
      );
    const existing = lobby.participants.find((p) => p.userId === userId);
    if (!existing) {
      if (
        lobby.status !== "OPEN" ||
        lobby.participants.length >= Math.min(lobby.maxPlayers, 8)
      )
        throw new AppError(
          409,
          "This lobby is full or no longer accepting players.",
          "LOBBY_FULL",
        );
      await tx.lobbyParticipant.create({ data: { lobbyId, userId } });
    } else
      await tx.lobbyParticipant.update({
        where: { userId_lobbyId: { lobbyId, userId } },
        data: { disconnectedAt: null },
      });
    const count = await tx.lobbyParticipant.count({ where: { lobbyId } });
    await tx.lobby.update({
      where: { id: lobbyId },
      data: {
        status:
          lobby.status === "IN_GAME"
            ? "IN_GAME"
            : count >= lobby.maxPlayers
              ? "FULL"
              : "OPEN",
        updatedAt: new Date(),
      },
    });
  });
  return getLobbyById(lobbyId, userId);
}
export async function assertMember(lobbyId, userId) {
  const p = await prisma.lobbyParticipant.findUnique({
    where: { userId_lobbyId: { lobbyId, userId } },
    include: { lobby: { select: { status: true } } },
  });
  if (!p || p.lobby.status === "CLOSED")
    throw new AppError(
      403,
      "Join the lobby before using this feature.",
      "NOT_A_MEMBER",
    );
  return p;
}
export const leaveLobby = (lobbyId, userId) =>
  locked(lobbyId, async (tx, lobby) => {
    if (lobby.status === "CLOSED")
      return { closed: true, igdbId: lobby.game.igdbId };
    membership(lobby, userId);
    return remove(tx, lobby, userId);
  });
export const closeLobby = (lobbyId, userId) =>
  locked(lobbyId, async (tx, lobby) => {
    host(lobby, userId);
    return close(tx, lobby);
  });
export const kickPlayer = (lobbyId, userId, targetUserId) =>
  locked(lobbyId, async (tx, lobby) => {
    membership(lobby, userId);
    host(lobby, userId);
    if (targetUserId === userId)
      throw new AppError(
        400,
        "You cannot remove yourself from the lobby.",
        "VALIDATION_ERROR",
      );
    membership(lobby, targetUserId);
    await tx.lobbyBan.upsert({
      where: { lobbyId_userId: { lobbyId, userId: targetUserId } },
      create: { lobbyId, userId: targetUserId },
      update: {},
    });
    return remove(tx, lobby, targetUserId);
  });
export const toggleReady = (lobbyId, userId) =>
  locked(lobbyId, async (tx, lobby) => {
    const p = membership(lobby, userId);
    await tx.lobbyParticipant.update({
      where: { id: p.id },
      data: { isReady: !p.isReady },
    });
  });
export const updateCredentials = (lobbyId, userId, credentials) =>
  locked(lobbyId, async (tx, lobby) => {
    membership(lobby, userId);
    host(lobby, userId);
    await tx.lobby.update({ where: { id: lobbyId }, data: { credentials } });
  });
export async function markDisconnected(lobbyId, userId) {
  await prisma.lobbyParticipant.updateMany({
    where: { lobbyId, userId },
    data: { disconnectedAt: new Date() },
  });
}
export const expireDeparture = (lobbyId, userId, cutoff) =>
  locked(lobbyId, async (tx, lobby) => {
    const p = lobby.participants.find((item) => item.userId === userId);
    if (
      !p?.disconnectedAt ||
      p.disconnectedAt > cutoff ||
      lobby.status === "CLOSED"
    )
      return null;
    return remove(tx, lobby, userId);
  });
export async function recoverPresence() {
  await prisma.lobbyParticipant.updateMany({
    data: { disconnectedAt: new Date() },
  });
}
