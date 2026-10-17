import { z } from 'zod';
import { AppError, parse } from '../lib/errors.js';
import { IgdbClient } from './igdb-client.js';
import { COLLECTIONS, REVIEWS, ONLINE_EVIDENCE, EXCLUDED_TYPES, isEligible, supportedOnlinePlatforms } from '../config/game-catalog.js';

const fields = 'fields name,slug,cover.url,genres.name,platforms.name,first_release_date,total_rating,total_rating_count,game_type,version_parent,game_modes.name,multiplayer_modes.platform,multiplayer_modes.onlinecoop,multiplayer_modes.onlinecoopmax,multiplayer_modes.onlinemax,multiplayer_modes.splitscreenonline;';
export function parseIgdbId(value) {
  const id = typeof value === 'number' ? value : typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new AppError(400, 'A valid IGDB game ID is required.', 'INVALID_GAME_ID');
  return id;
}
function ids(value) {
  if (!value) return [];
  if (typeof value !== 'string' || !/^\d+(,\d+)*$/.test(value) || value.split(',').length > 20) throw new AppError(400, 'Invalid game filters.', 'VALIDATION_ERROR');
  return [...new Set(value.split(',').map(parseIgdbId))];
}
export function formatGame(game) {
  const onlinePlatforms = supportedOnlinePlatforms(game);
  const rawCover = game.cover?.url;
  return { igdbId: game.id, name: game.name,
    cover: rawCover ? (rawCover.startsWith('//') ? `https:${rawCover}` : rawCover).replace('t_thumb', 't_cover_big') : null,
    genres: game.genres?.map(g => g.name) || [], genreIds: game.genres?.map(g => g.id) || [],
    platforms: onlinePlatforms.map(p => p.name), platformIds: onlinePlatforms.map(p => p.id), onlinePlatforms,
    releaseDate: game.first_release_date, totalRating: game.total_rating ?? null, totalRatingCount: game.total_rating_count ?? 0,
  };
}
export class GameCatalog {
  constructor(client = new IgdbClient()) { this.client = client; this.cache = new Map(); }
  async request(query, ttl = 5 * 60_000) {
    const cached = this.cache.get(query);
    if (cached?.expires > Date.now()) return cached.promise;
    if (this.cache.size >= 500) this.cache.delete(this.cache.keys().next().value);
    const promise = this.client.request('games', query).catch(error => { this.cache.delete(query); throw error; });
    this.cache.set(query, { expires: Date.now() + ttl, promise });
    return promise;
  }
  async getRawById(value) {
    const id = parseIgdbId(value);
    const [game] = await this.request(`${fields} where id = ${id}; limit 1;`, 24 * 3600_000);
    return isEligible(game) ? game : null;
  }
  async getById(value) { const game = await this.getRawById(value); return game ? formatGame(game) : null; }
  async list(input = {}) {
    const args = parse(z.object({ query: z.string().trim().max(100).regex(/^[^\x00-\x1f]*$/).optional(), category: z.enum(['trending','popular','shooters','rpg','coop']).optional(), genres: z.string().optional(), platforms: z.string().optional(), sortBy: z.enum(['relevance','popularity','newest','rating','name_asc']).optional(), offset: z.coerce.number().int().min(0).max(10000).default(0), limit: z.coerce.number().int().min(1).max(30).default(30) }).strict(), input);
    const genreIds = ids(args.genres); const platformIds = ids(args.platforms);
    const sort = args.sortBy || (args.query ? 'relevance' : 'popularity');
    const allow = Object.entries(REVIEWS).filter(([,review]) => review.allowPlatforms?.length).map(([id]) => id);
    const deny = Object.entries(REVIEWS).filter(([,review]) => review.denied).map(([id]) => id);
    const where = [ `version_parent = null`, `first_release_date <= ${Math.floor(Date.now()/3600_000)*3600}`, `(game_type = null | game_type != (${EXCLUDED_TYPES.join(',')}))`, `(${ONLINE_EVIDENCE} | id = (${allow.join(',')}))`, `id != (${deny.join(',')})` ];
    if (genreIds.length) where.push(`genres = (${genreIds.join(',')})`);
    if (platformIds.length) {
      const reviewed = Object.entries(REVIEWS).filter(([,review]) => review.allowPlatforms?.some(id => platformIds.includes(id))).map(([id]) => id);
      where.push(reviewed.length ? `(platforms = (${platformIds.join(',')}) | id = (${reviewed.join(',')}))` : `platforms = (${platformIds.join(',')})`);
    }
    if (COLLECTIONS[args.category]) where.push(`id = (${COLLECTIONS[args.category].join(',')})`);
    if (args.category === 'coop') where.push('(multiplayer_modes.onlinecoop = true | multiplayer_modes.onlinecoopmax > 1)');
    if (sort === 'rating') where.push('total_rating != null & total_rating_count >= 10');
    const relevance = Boolean(args.query && sort === 'relevance');
    if (args.query && !relevance) where.push(`name ~ *${JSON.stringify(args.query)}*`);
    const ordering = { popularity: 'total_rating_count desc', newest: 'first_release_date desc', rating: 'total_rating desc', name_asc: 'name asc', relevance: 'total_rating_count desc' }[sort];
    const collected = []; let offset = args.offset; let exhausted = false;
    // Fill pages after platform-level eligibility checks without skipping games.
    for (let batch = 0; batch < 5 && collected.length < args.limit + 1 && !exhausted; batch++) {
      const query = `${fields} ${relevance ? `search ${JSON.stringify(args.query)};` : `sort ${ordering};`} where ${where.join(' & ')}; limit 50; offset ${offset};`;
      const rows = await this.request(query);
      exhausted = rows.length < 50;
      for (const row of rows) {
        offset++;
        const collection = COLLECTIONS[args.category];
        const coOp = args.category !== 'coop' || row.multiplayer_modes?.some(m => m.onlinecoop === true || m.onlinecoopmax > 1);
        if ((!collection || collection.includes(row.id)) && coOp && isEligible(row, platformIds)) collected.push({ game: formatGame(row), after: offset });
        if (collected.length === args.limit + 1) break;
      }
    }
    const hasMore = collected.length > args.limit || !exhausted;
    const games = collected.slice(0,args.limit);
    return { games: games.map(item => item.game), nextOffset: hasMore ? (games.at(-1)?.after ?? offset) : null };
  }
}
export const catalog = new GameCatalog();
export const getGameById = id => catalog.getById(id);
