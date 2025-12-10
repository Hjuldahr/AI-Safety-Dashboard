import express from 'express';
import reportController from '../controllers/reportController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', isAuthenticated, reportController.getPage);
router.post('/create', isAuthenticated,  reportController.createReport);
router.post('/download-csv', isAuthenticated, reportController.downloadCsv);
router.post('/download-aggregates', isAuthenticated, reportController.downloadAggregatesCsv);

export default router;
