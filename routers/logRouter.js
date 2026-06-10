import express from "express";
import controller from "../controllers/logController.js";
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

// Get Page
router.get("/", authorize('view:logs'), controller.getPage);

// View Specific Page
router.get("/view/ai/:id", authorize('view:logs'), controller.getAILogView);
router.get("/view/summary/:id", authorize('view:logs'), controller.getAISummaryView);

// Get Specific Log
router.get("/ai/:id", authorize('view:logs'), controller.getAILog);


// Paginated Views
router.get("/api/user", authorize('view:logs'), controller.getFilteredUserLogs);
router.get("/api/ai", authorize('view:logs'), controller.getFilteredAILogs);
router.get("/api/summary", authorize('view:logs'), controller.getFilteredAISummaries);

// Tagging
router.put("/api/ai/:id/tags", authorize('edit:logs'), controller.tagAILog);

// Exports
router.post("/api/user/export/csv", authorize('export:logs'), controller.exportUserLogCSV);
router.post("/api/user/export/hdf5", authorize('export:logs'), controller.exportUserLogHDF5);
router.post("/api/ai/export/csv", authorize('export:logs'), controller.exportAILogCSV);
router.post("/api/ai/export/hdf5", authorize('export:logs'), controller.exportAILogHDF5);
router.post("/api/summary/export/csv", authorize('export:logs'), controller.exportAISummaryCSV);
router.post("/api/summary/export/hdf5", authorize('export:logs'), controller.exportAISummaryHDF5);

export default router;