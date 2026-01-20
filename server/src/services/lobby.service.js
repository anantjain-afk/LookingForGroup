import prisma from '../db/config.js';

export const createLobby = async (data, hostId) => {
  // data: { title, description?, gameId, maxPlayers?, tags: [tagId, tagId] }
  const { title, description, gameId, maxPlayers, tags } = data;

  return await prisma.lobby.create({
    data: {
      title,
      description,
      maxPlayers: parseInt(maxPlayers) || 5, // ensure int
      host: { connect: { id: hostId } },
      game: { connect: { id: gameId } },
      tags: tags && tags.length > 0 ? {
        connect: tags.map(tagId => ({ id: tagId }))
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
      tags: true,
      host: {
        select: { id: true, username: true, avatar: true }
      },
      participants: true
    }
  });
};

export const getAllLobbies = async (filters = {}) => {
  // Can add filtering logic here later (by game, tag, etc.)
  return await prisma.lobby.findMany({
    where: {
      status: 'OPEN',
      // ...filters
    },
    orderBy: { createdAt: 'desc' },
    include: {
      game: true,
      tags: true,
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
};
