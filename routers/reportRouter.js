import express from 'express';
import reportController from '../controllers/reportController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// If you have an auth middleware, apply it to the parent router in your app.
// Example in your main app: app.use('/reports', ensureAuth, reportRoutes);

router.get('/', isAuthenticated, reportController.getPage);
router.post('/create', isAuthenticated,  reportController.createReport);

export default router;
