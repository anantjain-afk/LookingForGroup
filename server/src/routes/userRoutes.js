import express from "express";
import { getMe } from "../controllers/userController.js";

const router = express.Router();

// GET /api/me - Get current user (mock for now)
router.get("/me", getMe);

export default router;
