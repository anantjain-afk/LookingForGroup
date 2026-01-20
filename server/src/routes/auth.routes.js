import express from "express";
import { register, login, logout } from "../controllers/auth.controller.js";

const router = express.Router();

// POST /api/register - Register a new user
router.post("/register", register);

// POST /api/login - Login a user
router.post("/login", login);

// POST /api/logout - Logout a user
router.post("/logout", logout);

export default router;
