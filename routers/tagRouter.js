import express from 'express';
import tagController from '../controllers/tagController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get('/', authorize('view:alerts'), tagController.listTags);
router.get("/hist", authorize('view:alerts'), tagController.listHistTags);
router.get("/hist/:id", authorize('view:alerts'), tagController.findHistTag);
router.post('/', authorize('acknowledge:alert'), tagController.createTag);
// sync mutates tags and is gated only by view:alerts (which visitors hold) — keep login required
router.post('/sync', isAuthenticated, authorize('view:alerts'), tagController.syncTags);

export default router;
