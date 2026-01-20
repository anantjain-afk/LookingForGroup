import prisma from "../db/config.js";
import jwt from "jsonwebtoken";
/**
 * Middleware to verify JWT token from cookies
 * Protects routes that require authentication
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-this",
    );

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        karmaScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in verifyToken:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token is invalid" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired" });
    }

    res.status(500).json({ error: "Server error during authentication" });
  }
};
