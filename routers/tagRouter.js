import express from 'express';
import tagController from '../controllers/tagController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', isAuthenticated, tagController.listTags);
router.post('/', isAuthenticated, tagController.createTag);
router.post('/sync', isAuthenticated, tagController.syncTags);

export default router;
