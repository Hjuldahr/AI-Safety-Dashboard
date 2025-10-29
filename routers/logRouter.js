import express from "express";
import controller from "../controllers/logController.js";

const router = express.Router();

router.get("/", controller.getPage);

router.get("/api/user", controller.getFilteredUserLogs);
router.get("/api/ai", controller.getFilteredAILogs);


// ToDo: Implement these
router.post("/api/user/export/csv", controller.exportUserLogCSV);
router.post("/api/user/export/pdf", controller.exportUserLogPDF);
router.post("/api/ai/export/csv", controller.exportAILogCSV);
router.post("/api/ai/export/pdf", controller.exportAILogPDF);

export default router;