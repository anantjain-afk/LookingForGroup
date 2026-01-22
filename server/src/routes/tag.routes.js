import express from 'express';
import * as tagController from '../controllers/tag.controller.js';

const router = express.Router();

// GET /api/tags - Public endpoint to fetch all tags
router.get('/', tagController.getTags);

export default router;
