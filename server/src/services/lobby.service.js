import prisma from '../db/config.js';

import { resolveGame, storedGame } from './game.service.js';
import { parseIgdbId } from './igdb.service.js';
import { z } from 'zod';
import { parse, AppError } from '../lib/errors.js';

export const createLobby = async (input, hostId, catalog) => {
  const data = parse(z.object({ igdbId: z.number().int().positive(), title: z.string().trim().min(3).max(80), description: z.string().max(1200).optional(), maxPlayers: z.coerce.number().int().min(2).max(20).default(5), tags: z.array(z.string().min(1).max(64)).max(12).default([]) }).strict(), input);
  const { title, description, igdbId, maxPlayers } = data;
  const tags = [...new Set(data.tags)];
  if (tags.length && await prisma.tag.count({ where: { id: { in: tags } } }) !== tags.length) throw new AppError(400, 'One or more lobby tags are invalid.', 'VALIDATION_ERROR');
  const { local: localGame } = await resolveGame(igdbId, catalog, true);

  // 2. Create Lobby linked to the local Game ID
  const lobby = await prisma.lobby.create({
    data: {
      title,
      description,
      maxPlayers: parseInt(maxPlayers) || 5, 
      host: { connect: { id: hostId } },
      game: { connect: { id: localGame.id } }, // Use local CUID
      tags: tags && tags.length > 0 ? {
        create: tags.map(tagId => ({
          tag: { connect: { id: tagId } }
        }))
      } : undefined,
      participants: {
        create: {
          user: { connect: { id: hostId } },
          role: 'HOST'
        }
      }
    },
    include: {
      game: true,
      tags: {
        include: {
          tag: true
        }
      },
      host: {
        select: { id: true, username: true, avatar: true }
      },
      participants: true
    }
  });

  return {
    ...lobby,
    game: storedGame(lobby.game),
    credentials: undefined,
    tags: lobby.tags.map(t => t.tag)
  };
};

export const getAllLobbies = async (filters = {}) => {
  const data = parse(z.object({ igdbId: z.union([z.string(), z.number()]).optional(), tags: z.string().max(1000).optional() }).strict(), filters);
  const where = { status: { in: ['OPEN', 'FULL'] }, game: { igdbId: { not: null } } };
  if (data.igdbId) where.game = { igdbId: parseIgdbId(data.igdbId) };
  if (data.tags) where.tags = { some: { tagId: { in: data.tags.split(',').filter(Boolean) } } };
  const lobbies = await prisma.lobby.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      game: true,
      tags: {
        include: {
          tag: true
        }
      },
      host: {
        select: { id: true, username: true, avatar: true, karmaScore: true }
      },
      participants: {
        select: {
            user: { select: { id: true, username: true, avatar: true } },
            role: true
        }
      }
    }
  });

  return lobbies.filter(lobby => storedGame(lobby.game)).map(({ credentials, ...lobby }) => ({
    ...lobby,
    game: storedGame(lobby.game),
    tags: lobby.tags.map(t => t.tag)
  }));
};

export const getLobbyById = async (id) => {
    const lobby = await prisma.lobby.findUnique({
        where: { id },
        include: {
            game: true,
            tags: {
                include: { tag: true }
            },
            host: {
                select: { id: true, username: true, avatar: true, karmaScore: true }
            },
            participants: {
                include: {
                    user: {
                        select: { id: true, username: true, avatar: true }
                    }
                }
            }
        }
    });

    if (!lobby) return null;

    return {
        ...lobby,
        game: storedGame(lobby.game),
        tags: lobby.tags.map(t => t.tag)
    };
};

export const closeLobby = async (lobbyId, userId) => {
    const lobby = await prisma.lobby.findUnique({
        where: { id: lobbyId }
    });

    if (!lobby) throw new Error("Lobby not found");
    if (lobby.hostId !== userId) throw new Error("Unauthorized");

    return await prisma.lobby.update({
        where: { id: lobbyId },
        data: { status: 'CLOSED' }
    });
};
