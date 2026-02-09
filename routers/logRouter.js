import express from "express";
import controller from "../controllers/logController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get("/", isAuthenticated, authorize('view:logs'), controller.getPage);

router.get("/api/user", isAuthenticated, authorize('view:logs'), controller.getFilteredUserLogs);
router.get("/api/ai", isAuthenticated, authorize('view:logs'), controller.getFilteredAILogs);
router.get("/api/summary", isAuthenticated, authorize('view:logs'), controller.getFilteredAISummaries);


// ToDo: Implement these
router.post("/api/user/export/csv", isAuthenticated, authorize('export:logs'), controller.exportUserLogCSV);
router.post("/api/user/export/pdf", isAuthenticated, authorize('export:logs'), controller.exportUserLogPDF);
router.post("/api/ai/export/csv", isAuthenticated, authorize('export:logs'), controller.exportAILogCSV);
router.post("/api/ai/export/pdf", isAuthenticated, authorize('export:logs'), controller.exportAILogPDF);

export default router;