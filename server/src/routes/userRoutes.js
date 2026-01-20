import express from "express";
import { getMe } from "../controllers/userController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// GET /api/me - Get current authenticated user (protected route)
router.get("/me", verifyToken, getMe);

export default router;
