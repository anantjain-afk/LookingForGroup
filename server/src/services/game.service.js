import prisma from '../db/config.js';
import { catalog, formatGame, parseIgdbId } from './igdb.service.js';
import { isEligible } from '../config/game-catalog.js';
import { AppError } from '../lib/errors.js';

export function storedGame(game) {
  return game?.igdbId && game.metadata?.id === game.igdbId && isEligible(game.metadata) ? formatGame(game.metadata) : null;
}
export async function resolveGame(value, provider = catalog, persist = false) {
  const igdbId = parseIgdbId(value);
  const local = await prisma.game.findUnique({ where: { igdbId } });
  if (local?.syncedAt > new Date(Date.now() - 24 * 3600_000) && storedGame(local)) return { local, game: storedGame(local) };
  let raw;
  try { raw = await provider.getRawById(igdbId); }
  catch (error) {
    // Only previously verified, recently synced records can serve as fallback.
    if (local?.syncedAt > new Date(Date.now() - 7 * 86400_000) && storedGame(local)) return { local, game: storedGame(local) };
    throw error;
  }
  if (!raw) throw new AppError(404, 'This game is not available for online lobbies.', 'GAME_UNAVAILABLE');
  const game = formatGame(raw);
  if (!persist && !local) return { local, game };
  const data = { name: game.name, imageUrl: game.cover, genre: game.genres[0] || null, metadata: raw, syncedAt: new Date() };
  const saved = await prisma.game.upsert({ where: { igdbId }, create: { igdbId, ...data }, update: data });
  return { local: saved, game };
}
