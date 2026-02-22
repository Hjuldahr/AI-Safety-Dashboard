import express from 'express';
import tagController from '../controllers/tagController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', isAuthenticated, authorize('view:alerts'), tagController.listTags);
router.get("/hist", isAuthenticated, authorize('view:alerts'), tagController.listHistTags);
router.get("/hist/:id", isAuthenticated, authorize('view:alerts'), tagController.findHistTag);
router.post('/', isAuthenticated, authorize('acknowledge:alert'), tagController.createTag);
router.post('/sync', isAuthenticated, authorize('view:alerts'), tagController.syncTags);

export default router;
