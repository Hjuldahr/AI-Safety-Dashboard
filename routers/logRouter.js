import express from "express";
import controller from "../controllers/logController.js";
import unusedLogController from "../controllers/unusedLogController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

// Get Page
router.get("/", isAuthenticated, authorize('view:logs'), controller.getPage);

// View Specific Page
router.get("/view/ai/:id", authorize('view:logs'), controller.getAILogView);
// router.get("/summary/:id", authorize('view:logs'), controller.getSummaryLog);

// Get Specific Log
router.get("/ai/:id", authorize('view:logs'), controller.getAILog);


// Paginated Views
router.get("/api/user", isAuthenticated, authorize('view:logs'), controller.getFilteredUserLogs);
router.get("/api/ai", isAuthenticated, authorize('view:logs'), controller.getFilteredAILogs);
router.get("/api/summary", isAuthenticated, authorize('view:logs'), controller.getFilteredAISummaries);

// Tagging
// ToDo: give this its own permission
router.put("/api/ai/:id/tags", isAuthenticated, authorize('view:logs'), controller.tagAILog);

// ToDo: Implement these
router.post("/api/user/export/csv", isAuthenticated, authorize('export:logs'), unusedLogController.exportUserLogCSV);
router.post("/api/user/export/pdf", isAuthenticated, authorize('export:logs'), unusedLogController.exportUserLogPDF);
router.post("/api/ai/export/csv", isAuthenticated, authorize('export:logs'), unusedLogController.exportAILogCSV);
router.post("/api/ai/export/pdf", isAuthenticated, authorize('export:logs'), unusedLogController.exportAILogPDF);

export default router;