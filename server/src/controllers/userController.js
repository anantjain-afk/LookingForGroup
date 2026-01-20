/**
 * User Controller
 * Handles all user-related HTTP requests
 */

/**
 * GET /api/me
 * Returns the current authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getMe = async (req, res) => {
  try {
    // Mock user data (will be replaced with real auth later)
    const mockUser = {
      id: 1,
      username: "TestUser",
    };

    res.json(mockUser);
  } catch (error) {
    console.error("Error in getMe:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
};
