import { searchGames, getPopularGames, getDiscoveryGames, getGameById } from '../services/igdb.service.js';
import * as lobbyService from '../services/lobby.service.js';

export const getGames = async (req, res) => {
  const { query, category } = req.query; // e.g. /api/games?query=valorant OR /api/games?category=shooters

  try {
    let games;
    if (query) {
        games = await searchGames(query);
    } else if (category) {
        games = await getDiscoveryGames(category);
    } else {
        games = await getPopularGames();
    }
    
    // Transform data slightly (IGDB image URLs are weird)
    const formattedGames = games.map(game => ({
      id: game.id,
      name: game.name,
      // IGDB returns "//images.igdb.com/..." so we prepend https:
      cover: game.cover ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null, 
      platforms: game.platforms?.map(p => p.name) || [],
      genres: game.genres?.map(g => g.name) || []
    }));

    res.json(formattedGames);
  } catch (error) {
    console.error("Game Controller Error:", error);
    res.status(500).json({ error: "Failed to fetch games" });
  }
};

export const getGameDetails = async (req, res) => {
    const { gameId } = req.params;
    try {
        // Import dynamically or assume imported at top? 
        // Best to add import at top, but for now let's assume getGameById needs to be imported
        const game = await getGameById(gameId); 
        if (!game) return res.status(404).json({ error: "Game not found" });
        res.json(game);
    } catch (error) {
         console.error("Get Game Details Error:", error);
         res.status(500).json({ error: "Failed to fetch game details" });
    }
};

export const getGameLobbies = async (req, res) => {
    const { gameId } = req.params;
    try {
        // Reuse lobby service with filter
        const lobbies = await lobbyService.getAllLobbies({ gameId });
        res.json(lobbies);
    } catch (error) {
        console.error("Get Game Lobbies Error:", error);
        res.status(500).json({ error: "Failed to fetch game lobbies" });
    }
};