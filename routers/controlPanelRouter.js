import express from 'express';
import controller from '../controllers/controlPanelController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

// Control Panel Parameters (Scheduler Settings)
router.get("/api/params", controller.getParams)
router.patch('/api/params', isAuthenticated, authorize('edit:system'), controller.updateParams);

// Graph CRUD
router.post("/api/graph", isAuthenticated, authorize('create:graph'), controller.saveGraph);
router.put("/api/graph", isAuthenticated, authorize('edit:graph'), controller.updateGraph);
router.delete("/api/graph", isAuthenticated, authorize('delete:graph'), controller.deleteGraph);

router.get("/api/getChartConfig/:id", isAuthenticated, authorize('view:dashboard'), controller.getChartConfig);
router.post("/api/reorder", isAuthenticated, authorize('edit:graph'), controller.reorderCharts);


export default router;