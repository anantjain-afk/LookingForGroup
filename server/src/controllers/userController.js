import prisma from '../db/config.js';
import { getGameById } from '../services/igdb.service.js';

/**
 * GET /api/me
 * Returns the current authenticated user
 * @param {Object} req - Express request object (with req.user from verifyToken middleware)
 * @param {Object} res - Express response object
 */
export const getMe = async (req, res) => {
  try {
    // User is already attached to req by verifyToken middleware
    const userWithFavorites = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        favoriteGames: true
      }
    });
    res.json(userWithFavorites);
  } catch (error) {
    console.error("Error in getMe:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
};

/**
 * PUT /api/me
 * Updates the current authenticated user's profile
 */
export const updateProfile = async (req, res) => {
    try {
        const { username, bio } = req.body;
        const userId = req.user.id;

        // Validation
        if (username && username.trim().length < 3) {
             return res.status(400).json({ error: "Username must be at least 3 characters" });
        }

        // Check uniqueness if username changes
        if (username && username !== req.user.username) {
             const existing = await prisma.user.findUnique({ where: { username } });
             if (existing) {
                 return res.status(400).json({ error: "Username already taken" });
             }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username: username || undefined,
                bio: bio // Allow empty string
            },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                bio: true,
                karmaScore: true,
                favoriteGames: true
            }
        });

        res.json(updatedUser);

    } catch (error) {
        console.error("Error in updateProfile:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
};

/**
 * GET /api/users/profile/:username
 * Public route to get user profile by username
 */
export const getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;

        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                avatar: true,
                bio: true,
                karmaScore: true,
                createdAt: true,
                favoriteGames: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
};

export const addFavoriteGame = async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.user.id;

        let localGame = await prisma.game.findUnique({
            where: { igdbId: parseInt(gameId) }
        });

        if (!localGame && !isNaN(gameId)) {
            const igdbGame = await getGameById(gameId);
            if (!igdbGame) return res.status(404).json({ error: "Game not found in IGDB" });
            
            localGame = await prisma.game.findFirst({ where: { name: igdbGame.name } });
            if (localGame) {
                localGame = await prisma.game.update({
                    where: { id: localGame.id },
                    data: { igdbId: igdbGame.id, imageUrl: igdbGame.cover, genre: igdbGame.genres ? igdbGame.genres[0] : "Unknown" }
                });
            } else {
                localGame = await prisma.game.create({
                    data: { name: igdbGame.name, igdbId: igdbGame.id, imageUrl: igdbGame.cover, genre: igdbGame.genres ? igdbGame.genres[0] : "Unknown" }
                });
            }
        } else if (!localGame && isNaN(gameId)) {
            localGame = await prisma.game.findUnique({ where: { id: gameId } });
        }

        if (!localGame) return res.status(404).json({ error: "Game not found" });

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                favoriteGames: {
                    connect: { id: localGame.id }
                }
            },
            include: { favoriteGames: true }
        });

        res.json(updatedUser.favoriteGames);
    } catch (error) {
        console.error("Error adding favorite game:", error);
        res.status(500).json({ error: "Failed to add favorite game" });
    }
};

export const removeFavoriteGame = async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.user.id;

        let localGameId = gameId;
        if (!isNaN(gameId)) {
            const localGame = await prisma.game.findUnique({ where: { igdbId: parseInt(gameId) } });
            if (localGame) localGameId = localGame.id;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                favoriteGames: {
                    disconnect: { id: localGameId }
                }
            },
            include: { favoriteGames: true }
        });

        res.json(updatedUser.favoriteGames);
    } catch (error) {
        console.error("Error removing favorite game:", error);
        res.status(500).json({ error: "Failed to remove favorite game" });
    }
};
