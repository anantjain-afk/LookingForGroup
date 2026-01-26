import express from "express";
import { getMe, updateProfile, getUserProfile } from "../controllers/userController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// GET /api/me - Get current authenticated user (protected route)
router.get("/me", verifyToken, getMe);

// PUT /api/me - Update profile
router.put("/me", verifyToken, updateProfile);

// GET /api/users/profile/:username - Public profile
router.get("/users/profile/:username", getUserProfile);

export default router;
