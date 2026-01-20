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
// 2. The Search Function
export const searchGames = async (query) => {
  const token = await getAccessToken();

  try {
    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      // The "Body" here is the Apicalypse Query Language
      `search "${query}"; 
      
       fields name, cover.url, genres.name, platforms.name, first_release_date; 
       limit 20;`,
      {
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`, // We must send the token here
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
      console.log("IGDB Popular Games Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("IGDB Popular Games Error:", error.response?.data || error.message);
      throw error;
    }
  };