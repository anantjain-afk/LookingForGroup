// server/src/services/igdb.service.js
import axios from 'axios';

let accessToken = null;
let tokenExpiry = 0;

// 1. Helper to get a valid Access Token (OAuth)
const getAccessToken = async () => {
  // Return cached token if valid
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    // IGDB requires us to "trade" our Client ID/Secret for an Access Token
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token`,
      null,
      {
        params: {
          client_id: process.env.IGDB_CLIENT_ID,
          client_secret: process.env.IGDB_CLIENT_SECRET,
          grant_type: 'client_credentials',
        },
      }
    );

    accessToken = response.data.access_token;
    // Set expiry to 1 hour from now (safety buffer)
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return accessToken;
  } catch (error) {
    console.error("Error fetching IGDB token:", error.message);
    throw new Error("Failed to authenticate with IGDB");
  }
};

// 2. The Search Function
export const searchGames = async (query = "", filters = {}) => {
  const token = await getAccessToken();
  const { genres, platforms } = filters;

  console.log("Searching IGDB with:", { query, genres, platforms });

  let whereClause = "where cover != null & version_parent = null";

  // Filter by Query (Name)
  if (query && query.trim().length > 0) {
      whereClause += ` & name ~ *"${query}"*`; // Case-insensitive partial match
  }

  // Filter by Genres
  if (genres && genres.length > 0) {
      const genreString = genres.join(',');
      whereClause += ` & genres = (${genreString})`;
  }

  // Filter by Platforms
  if (platforms && platforms.length > 0) {
      const platformString = platforms.join(',');
      whereClause += ` & platforms = (${platformString})`;
  }

  // Default sorting if searching
  const sortClause = query ? "" : "sort total_rating_count desc;";

  try {
    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      `fields name, cover.url, genres.name, platforms.name, first_release_date, total_rating_count; 
       ${whereClause};
       ${sortClause}
       limit 30;`,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`, 
          'Accept': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("IGDB Search Error:", error.response?.data || error.message);
    throw error;
  }
};

// 3. Get Popular Games (Trending)
export const getPopularGames = async () => {
    const token = await getAccessToken();
  
    try {
      const query = `
      fields name, cover.url, total_rating_count, genres.name, game_modes.name, multiplayer_modes.*;
      sort total_rating_count desc;
      where cover != null 
        & total_rating_count > 100 
        & multiplayer_modes.onlinemax > 1; 
      limit 20;
    `;
      const response = await axios.post(
        'https://api.igdb.com/v4/games',
        query,
        {
          headers: {
            'Client-ID': process.env.IGDB_CLIENT_ID,
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );
      // console.log("IGDB Popular Games Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("IGDB Popular Games Error:", error.response?.data || error.message);
      throw error;
    }
  };

// 4. Get Discovery Games (Filtered by Genre/Mode)
export const getDiscoveryGames = async (category) => {
    const token = await getAccessToken();
    let whereClause = "where cover != null & total_rating_count > 50";

    // Categories mapping to IGDB IDs
    switch (category) {
        case 'shooters':
            whereClause += " & genres = (5) & game_modes = (2) & multiplayer_modes.onlinemax > 1"; // Competitive Shooters
            break;
        case 'rpg':
              whereClause += " & genres = (12) & multiplayer_modes.onlinemax > 1"; // MMO & Raids (RPG + Multiplayer)
            break;
        case 'coop':
              whereClause += " & (game_modes = (3) | multiplayer_modes.onlinecoop = true) & cover != null"; // Chill & Co-op
            break;
        default:
            // "Trending" logic if no specific category or fallback
              whereClause += " & total_rating_count > 100"; 
              break;
    }

    try {
      const query = `
      fields name, cover.url, total_rating_count, genres.name, game_modes.name , multiplayer_modes.*;
      sort total_rating_count desc;
      
      ${whereClause}; 
      limit 20;
    `;
      const response = await axios.post(
        'https://api.igdb.com/v4/games',
        query,
        {
          headers: {
            'Client-ID': process.env.IGDB_CLIENT_ID,
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("IGDB Discovery Error:", error.response?.data || error.message);
      throw error;
    }
};

// 5. Get Game Details by ID
export const getGameById = async (gameId) => {
    const token = await getAccessToken();
    try {
        const response = await axios.post(
            'https://api.igdb.com/v4/games',
            `fields name, cover.url, genres.name, platforms.name, first_release_date; where id = ${gameId};`,
            {
                headers: {
                    'Client-ID': process.env.IGDB_CLIENT_ID,
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            }
        );
        const game = response.data[0];
        if (!game) return null;
        
        return {
             id: game.id,
             name: game.name,
             cover: game.cover ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null,
             genres: game.genres?.map(g => g.name) || [],
             platforms: game.platforms?.map(p => p.name) || [],
             releaseDate: game.first_release_date
        };
    } catch (error) {
        console.error("IGDB Get Game Error:", error.response?.data || error.message);
        throw error;
    }
};