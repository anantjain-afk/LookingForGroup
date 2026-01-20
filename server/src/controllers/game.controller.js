import { searchGames } from '../services/igdb.service.js';

export const getGames = async (req, res) => {
  const { query } = req.query; // e.g. /api/games?query=valorant

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    const games = await searchGames(query);
    
    // Transform data slightly (IGDB image URLs are weird)
    const formattedGames = games.map(game => ({
      id: game.id,
      name: game.name,
      // IGDB returns "//images.igdb.com/..." so we prepend https:
      cover: game.cover ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null, 
      platforms: game.platforms?.map(p => p.name) || [],
    }));

    res.json(formattedGames);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch games" });
  }
};