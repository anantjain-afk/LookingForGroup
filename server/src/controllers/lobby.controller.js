import * as lobbyService from "../services/lobby.service.js";
import { getIceServers } from "../services/voice.service.js";
import { AppError } from "../lib/errors.js";
import { REGIONS, CAPACITIES } from "../config/lobbies.js";
export const createLobby = async (req, res) =>
  res
    .status(201)
    .json(
      await lobbyService.createLobby(
        req.body,
        req.user.id,
        req.app.locals.catalog,
      ),
    );
export const getLobbies = async (req, res) =>
  res.json(await lobbyService.getAllLobbies(req.query));
export const getLobby = async (req, res) => {
  const lobby = await lobbyService.getLobbyById(req.params.id);
  if (!lobby) throw new AppError(404, "Lobby not found.", "LOBBY_NOT_FOUND");
  res.json(lobby);
};
export const closeLobby = async (req, res) => {
  const result = await lobbyService.closeLobby(req.params.id, req.user.id);
  await req.app.locals.realtime.closed(req.params.id, result.igdbId);
  res.json({ message: "Lobby closed." });
};
export const metadata = (_req, res) =>
  res.json({ regions: REGIONS, capacities: CAPACITIES });
export const iceServers = async (req, res) => {
  await lobbyService.assertMember(req.params.id, req.user.id);
  res
    .set("Cache-Control", "no-store")
    .json({
      iceServers: await (req.app.locals.iceProvider || getIceServers)(),
    });
};
