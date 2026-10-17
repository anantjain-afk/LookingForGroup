import { catalog, parseIgdbId } from '../services/igdb.service.js';
import { resolveGame } from '../services/game.service.js';
import * as lobbyService from '../services/lobby.service.js';
import { PLATFORMS, GENRES } from '../config/game-catalog.js';
export async function getGames(req, res) { res.json(await (req.app.locals.catalog || catalog).list(req.query)); }
export function getFilters(_req, res) { res.json({ platforms: PLATFORMS, genres: GENRES }); }
export async function getGameDetails(req, res) {
 const { game } = await resolveGame(req.params.gameId, req.app.locals.catalog || catalog);
 res.json(game);
}
export async function getGameLobbies(req, res) {
 const igdbId = parseIgdbId(req.params.gameId);
 await resolveGame(igdbId, req.app.locals.catalog || catalog);
 res.json(await lobbyService.getAllLobbies({ ...req.query, igdbId }));
}
