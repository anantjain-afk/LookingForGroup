import prisma from '../db/config.js';
import { userSelect } from './session.service.js';
import { storedGame } from './game.service.js';

export async function privateUser(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: { ...userSelect, googleSub: true, favoriteGames: true } });
  if (!user) return null;
  const { googleSub, ...safe } = user;
  return { ...safe, favoriteGames: safe.favoriteGames.map(storedGame).filter(Boolean), googleLinked: Boolean(googleSub) };
}
