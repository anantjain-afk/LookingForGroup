import prisma from '../db/config.js';
import { userSelect } from './session.service.js';

export async function privateUser(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: { ...userSelect, googleSub: true, favoriteGames: true } });
  if (!user) return null;
  const { googleSub, ...safe } = user;
  return { ...safe, googleLinked: Boolean(googleSub) };
}
