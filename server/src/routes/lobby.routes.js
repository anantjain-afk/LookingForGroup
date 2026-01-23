import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import * as lobbyController from '../controllers/lobby.controller.js';

const router = express.Router();

// GET /api/lobbies - Public or Protected? usually public to browse, but verifyToken helps if we want to customize for user
// Taking specs "If Public: Instant join", implied browsing is open?
// For now, let's keep browsing public-ish or just require token for simplicity as per "Auth User" flow
router.get('/', lobbyController.getLobbies);

// POST /api/lobbies - Create Lobby (Protected)
router.post('/', verifyToken, lobbyController.createLobby);

// GET /api/lobbies/:id - Get Single Lobby (Public/Protected?)
router.get('/:id', lobbyController.getLobby);

export default router;
