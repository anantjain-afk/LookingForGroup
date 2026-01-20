import prisma from "../db/config.js";

export const findUserByEmailOrUsername = async (email, username) => {
  return await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });
};

export const createUser = async (data) => {
  return await prisma.user.create({
    data,
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      bio: true,
      karmaScore: true,
      createdAt: true,
    },
  });
};

export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};
