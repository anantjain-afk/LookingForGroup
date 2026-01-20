/**
 * User Controller
 * Handles all user-related HTTP requests
 */

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
