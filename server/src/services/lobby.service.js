import prisma from '../db/config.js';

import { getGameById } from './igdb.service.js';

export const createLobby = async (data, hostId) => {
  const { title, description, gameId, maxPlayers, tags } = data;

  // 1. Resolve Game ID (Handle Internal vs IGDB ID)
  // Input 'gameId' is likely the IGDB ID (Int) from the frontend
  let localGame = await prisma.game.findUnique({
      where: { igdbId: parseInt(gameId) }
  });

  if (!localGame) {
      // Fetch details from IGDB to create local record
      const igdbGame = await getGameById(gameId);
      if (!igdbGame) throw new Error("Invalid Game ID");
      
      localGame = await prisma.game.create({
          data: {
              name: igdbGame.name,
              igdbId: igdbGame.id,
              imageUrl: igdbGame.cover,
              genre: igdbGame.genres[0] || "Unknown"
          }
      });
  }

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
    tags: lobby.tags.map(t => t.tag)
  };
};

export const getAllLobbies = async (filters = {}) => {
  const { gameId, tags, ...otherFilters } = filters;
  
  const where = {
     status: 'OPEN',
     ...otherFilters
  };

  // Filter by Tags (if provided)
  if (tags) {
      const tagIds = tags.split(',').filter(id => id.trim() !== '');
      if (tagIds.length > 0) {
          where.tags = {
              some: {
                  tagId: { in: tagIds }
              }
          };
      }
  }

  if (gameId) {
      // If It's a number (IGDB ID), find the local ID first
      // Because Lobby.gameId stores the local CUID
      const localGame = await prisma.game.findUnique({
          where: { igdbId: parseInt(gameId) } // Assuming we added igdbId @unique
      });
      
      if (localGame) {
           where.gameId = localGame.id;
      } else {
           // If passed ID is a CUID string (less likely from our UI but possible)
           if (typeof gameId === 'string' && gameId.length > 20) {
               where.gameId = gameId;
           } else {
               return []; // Game not found locally, so no lobbies
           }
      }
  }

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

  return lobbies.map(lobby => ({
    ...lobby,
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
