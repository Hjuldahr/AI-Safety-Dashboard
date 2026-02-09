import express from 'express';
import tagController from '../controllers/tagController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get('/', isAuthenticated, authorize('view:alerts'), tagController.listTags);
router.post('/', isAuthenticated, authorize('acknowledge:alert'), tagController.createTag);
router.post('/sync', isAuthenticated, authorize('view:alerts'), tagController.syncTags);

export default router;
