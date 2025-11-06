import express from 'express';
import controller from '../controllers/controlPanelController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/api/updateParams', isAuthenticated, controller.updateParams);

export default router;