import express from 'express';
import chartController from '../controllers/chartController.js';
import indexController from '../controllers/indexController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

// Control Panel Parameters (Scheduler Settings)
router.get("/api/params", isAuthenticated, authorize('view:dashboard'), indexController.getParams)
router.patch('/api/params', isAuthenticated, authorize('edit:system'), indexController.updateParams);

// Graph CRUD
router.post("/api/graph", isAuthenticated, authorize('create:graph'), chartController.saveGraph);
router.put("/api/graph", isAuthenticated, authorize('edit:graph'), chartController.updateGraph);
router.patch("/api/graph", isAuthenticated, authorize('edit:graph'), chartController.patchGraph);
router.delete("/api/graph", isAuthenticated, authorize('delete:graph'), chartController.deleteGraph);

router.get("/api/getChartConfig/:id", isAuthenticated, authorize('view:dashboard'), chartController.getChartConfig);
router.post("/api/reorder", isAuthenticated, authorize('edit:graph'), chartController.reorderCharts);


export default router;