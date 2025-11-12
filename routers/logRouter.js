import express from "express";
import controller from "../controllers/logController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", isAuthenticated, controller.getPage);

router.get("/api/user", isAuthenticated, controller.getFilteredUserLogs);
router.get("/api/ai", isAuthenticated, controller.getFilteredAILogs);


// ToDo: Implement these
router.post("/api/user/export/csv", isAuthenticated, controller.exportUserLogCSV);
router.post("/api/user/export/pdf", isAuthenticated, controller.exportUserLogPDF);
router.post("/api/ai/export/csv", isAuthenticated, controller.exportAILogCSV);
router.post("/api/ai/export/pdf", isAuthenticated, controller.exportAILogPDF);

export default router;