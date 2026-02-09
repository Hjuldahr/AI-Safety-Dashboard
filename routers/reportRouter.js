import express from 'express';
import reportController from '../controllers/reportController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get('/', isAuthenticated, authorize('view:reports'), reportController.getPage);
router.post('/', isAuthenticated, authorize('create:report'), reportController.createReport);
router.post('/download-csv', isAuthenticated, authorize('export:report'), reportController.downloadCsv);
router.post('/download-aggregates', isAuthenticated, authorize('export:report'), reportController.downloadAggregatesCsv);

export default router;
