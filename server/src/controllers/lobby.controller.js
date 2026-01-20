import * as lobbyService from '../services/lobby.service.js';

export const createLobby = async (req, res) => {
  try {
    const lobby = await lobbyService.createLobby(req.body, req.user.id);
    res.status(201).json(lobby);
  } catch (error) {
    console.error("Create Lobby Error:", error);
    res.status(500).json({ error: "Failed to create lobby" });
  }
};

export const getLobbies = async (req, res) => {
  try {
    const lobbies = await lobbyService.getAllLobbies(req.query);
    res.json(lobbies);
  } catch (error) {
    console.error("Get Lobbies Error:", error);
    res.status(500).json({ error: "Failed to fetch lobbies" });
  }
};
