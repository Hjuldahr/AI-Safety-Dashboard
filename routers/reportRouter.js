import express from 'express';
import reportController from '../controllers/reportController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', isAuthenticated, reportController.getPage);
router.post('/create', isAuthenticated,  reportController.createReport);
router.get('/download-csv', isAuthenticated, reportController.downloadCsv);
router.get('/download-aggregates', isAuthenticated, reportController.downloadAggregatesCsv);

export default router;
