import prisma from '../db/config.js';

/**
 * GET /api/me
 * Returns the current authenticated user
 * @param {Object} req - Express request object (with req.user from verifyToken middleware)
 * @param {Object} res - Express response object
 */
export const getMe = async (req, res) => {
  try {
    // User is already attached to req by verifyToken middleware
    res.json(req.user);
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
                karmaScore: true
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
                createdAt: true
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
