import express from 'express';
import controller from '../controllers/controlPanelController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Control Panel Parameters (Scheduler Settings)
router.get("/api/params", controller.getParams)
router.patch('/api/params', isAuthenticated, controller.updateParams);

// Graph CRUD
router.post("/api/graph", isAuthenticated, controller.saveGraph);
router.put("/api/graph", isAuthenticated, controller.updateGraph);
router.delete("/api/graph", isAuthenticated, controller.deleteGraph);

router.get("/api/getChartConfig/:id", isAuthenticated, controller.getChartConfig);
router.post("/api/reorder", isAuthenticated, controller.reorderCharts);


export default router;