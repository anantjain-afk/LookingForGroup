import express from 'express';
import * as gameController from '../controllers/game.controller.js';

const router = express.Router();

router.get('/', gameController.getGames);

export default router;
