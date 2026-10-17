import { z } from 'zod';
import prisma from '../db/config.js';
import { privateUser } from '../services/auth.service.js';
import { resolveGame, storedGame } from '../services/game.service.js';
import { parseIgdbId } from '../services/igdb.service.js';
import { AppError, parse } from '../lib/errors.js';
export async function getMe(req, res) { res.json(await privateUser(req.user.id)); }
export async function updateProfile(req, res) {
 const data = parse(z.object({ username: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/).optional(), bio: z.string().max(1000).optional() }).strict(), req.body);
 await prisma.user.update({ where: { id: req.user.id }, data });
 res.json(await privateUser(req.user.id));
}
export async function getUserProfile(req, res) {
 const user = await prisma.user.findUnique({ where: { username: req.params.username }, select: { id:true,username:true,avatar:true,bio:true,karmaScore:true,createdAt:true,favoriteGames:true } });
 if (!user) throw new AppError(404,'User not found','NOT_FOUND');
 res.json({ ...user, favoriteGames: user.favoriteGames.map(storedGame).filter(Boolean) });
}
export async function addFavoriteGame(req, res) {
 const { local } = await resolveGame(req.params.gameId, req.app.locals.catalog, true);
 await prisma.user.update({ where: { id: req.user.id }, data: { favoriteGames: { connect: { id: local.id } } } });
 res.json((await privateUser(req.user.id)).favoriteGames);
}
export async function removeFavoriteGame(req, res) {
 const igdbId = parseIgdbId(req.params.gameId);
 const game = await prisma.game.findUnique({ where: { igdbId } });
 if (game) await prisma.user.update({ where: { id:req.user.id }, data: { favoriteGames: { disconnect: { id:game.id } } } });
 res.json((await privateUser(req.user.id)).favoriteGames);
}
