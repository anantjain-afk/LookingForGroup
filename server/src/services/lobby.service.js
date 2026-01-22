import prisma from '../db/config.js';

export const createLobby = async (data, hostId) => {
  // data: { title, description?, gameId, maxPlayers?, tags: [tagId, tagId] }
  const { title, description, gameId, maxPlayers, tags } = data;

  const lobby = await prisma.lobby.create({
    data: {
      title,
      description,
      maxPlayers: parseInt(maxPlayers) || 5, // ensure int
      host: { connect: { id: hostId } },
      game: { connect: { id: gameId } },
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
  // Can add filtering logic here later (by game, tag, etc.)
  const lobbies = await prisma.lobby.findMany({
    where: {
      status: 'OPEN',
      // ...filters
    },
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
