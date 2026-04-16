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

// Report History
router.get('/history', isAuthenticated, authorize('view:reports'), reportController.getHistory);
router.get('/history/:id/pdf', isAuthenticated, authorize('view:reports'), reportController.getHistoryPdf);
router.get('/history/:id/download/:type', isAuthenticated, authorize('export:report'), reportController.downloadFromHistory);
router.delete('/history/:id', isAuthenticated, authorize('delete:report'), reportController.deleteReport);

// Report Templates
router.get('/templates', isAuthenticated, authorize('view:reports'), reportController.getTemplates);
router.post('/templates', isAuthenticated, authorize('create:report'), reportController.createTemplate);
router.delete('/templates/:id', isAuthenticated, authorize('delete:report'), reportController.deleteTemplate);

export default router;
