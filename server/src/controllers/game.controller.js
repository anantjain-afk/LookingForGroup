import { searchGames, getPopularGames, getDiscoveryGames } from '../services/igdb.service.js';

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