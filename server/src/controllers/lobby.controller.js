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

export const getLobby = async (req, res) => {
    const { id } = req.params;
    try {
        const lobby = await lobbyService.getLobbyById(id);
        if (!lobby) {
            return res.status(404).json({ error: "Lobby not found" });
        }
        res.json(lobby);
    } catch (error) {
        console.error("Get Lobby Error:", error);
        res.status(500).json({ error: "Failed to fetch lobby" });
    }
}

export const closeLobby = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const result = await lobbyService.closeLobby(id, userId);
        
        // Emit Socket Event
        const io = req.app.get("io");
        io.to(`lobby_${id}`).emit("LOBBY_DISBANDED");

        res.json(result);
    } catch (error) {
        console.error("Close Lobby Error:", error);
        if (error.message === "Unauthorized" || error.message === "Lobby not found") {
            res.status(403).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Failed to close lobby" });
        }
    }
};
