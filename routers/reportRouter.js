import express from 'express';
import reportController from '../controllers/reportController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get('/', isAuthenticated, authorize('view:reports'), reportController.getPage);
router.post('/', isAuthenticated, authorize('create:report'), reportController.createReport);
router.post('/download-logs', isAuthenticated, authorize('export:report'), reportController.downloadAiLogs);
router.post('/download-summaries', isAuthenticated, authorize('export:report'), reportController.downloadAiSummaries);
router.post('/download-aggregates', isAuthenticated, authorize('export:report'), reportController.downloadAggregatesCsv);
router.post('/download-hdf5', isAuthenticated, authorize('export:report'), reportController.downloadHdf5);

export default router;
