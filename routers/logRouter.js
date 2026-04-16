import express from "express";
import controller from "../controllers/logController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

// Get Page
router.get("/", isAuthenticated, authorize('view:logs'), controller.getPage);

// View Specific Page
router.get("/view/ai/:id", isAuthenticated, authorize('view:logs'), controller.getAILogView);

// Get Specific Log
router.get("/ai/:id", isAuthenticated, authorize('view:logs'), controller.getAILog);


// Paginated Views
router.get("/api/user", isAuthenticated, authorize('view:logs'), controller.getFilteredUserLogs);
router.get("/api/ai", isAuthenticated, authorize('view:logs'), controller.getFilteredAILogs);
router.get("/api/summary", isAuthenticated, authorize('view:logs'), controller.getFilteredAISummaries);

// Tagging
router.put("/api/ai/:id/tags", isAuthenticated, authorize('edit:logs'), controller.tagAILog);

// Exports
router.post("/api/user/export/csv", isAuthenticated, authorize('export:logs'), controller.exportUserLogCSV);
router.post("/api/user/export/hdf5", isAuthenticated, authorize('export:logs'), controller.exportUserLogHDF5);
router.post("/api/ai/export/csv", isAuthenticated, authorize('export:logs'), controller.exportAILogCSV);
router.post("/api/ai/export/hdf5", isAuthenticated, authorize('export:logs'), controller.exportAILogHDF5);
router.post("/api/summary/export/csv", isAuthenticated, authorize('export:logs'), controller.exportAISummaryCSV);
router.post("/api/summary/export/hdf5", isAuthenticated, authorize('export:logs'), controller.exportAISummaryHDF5);

export default router;