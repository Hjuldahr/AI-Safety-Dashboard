import express from 'express';
import reportController from '../controllers/reportController.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get('/', authorize('view:reports'), reportController.getPage);
router.post('/', authorize('create:report'), reportController.createReport);
router.post('/download-logs', authorize('export:report'), reportController.downloadAiLogs);
router.post('/download-summaries', authorize('export:report'), reportController.downloadAiSummaries);
router.post('/download-aggregates', authorize('export:report'), reportController.downloadAggregatesCsv);
router.post('/download-hdf5', authorize('export:report'), reportController.downloadHdf5);

// Report History
router.get('/history', authorize('view:reports'), reportController.getHistory);
router.get('/history/:id/pdf', authorize('view:reports'), reportController.getHistoryPdf);
router.get('/history/:id/download/:type', authorize('export:report'), reportController.downloadFromHistory);
router.delete('/history/:id', authorize('delete:report'), reportController.deleteReport);

// Report Templates
router.get('/templates', authorize('view:reports'), reportController.getTemplates);
router.post('/templates', authorize('create:report'), reportController.createTemplate);
router.delete('/templates/:id', authorize('delete:report'), reportController.deleteTemplate);

export default router;
