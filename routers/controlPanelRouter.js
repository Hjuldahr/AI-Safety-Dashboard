import express from 'express';
import chartController from '../controllers/chartController.js';
import indexController from '../controllers/indexController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Control Panel Parameters (Scheduler Settings)
router.get("/api/params", indexController.getParams)
router.patch('/api/params', isAuthenticated, indexController.updateParams);

// Graph CRUD
router.post("/api/graph", isAuthenticated, chartController.saveGraph);
router.put("/api/graph", isAuthenticated, chartController.updateGraph);
router.patch("/api/graph", isAuthenticated, chartController.patchGraph);
router.delete("/api/graph", isAuthenticated, chartController.deleteGraph);

router.get("/api/getChartConfig/:id", isAuthenticated, chartController.getChartConfig);
router.post("/api/reorder", isAuthenticated, chartController.reorderCharts);


export default router;