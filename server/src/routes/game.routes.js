import express from 'express';
import * as gameController from '../controllers/game.controller.js';

const router = express.Router();

router.get('/', gameController.getGames);
router.get('/filters', gameController.getFilters);
router.get('/:gameId', gameController.getGameDetails);
router.get('/:gameId/lobbies', gameController.getGameLobbies);

export default router;
