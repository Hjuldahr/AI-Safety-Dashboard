import express from 'express';
import chartController from '../controllers/chartController.js';
import indexController from '../controllers/indexController.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

// Control Panel Parameters (Scheduler Settings)
router.get("/api/params", authorize('view:dashboard'), indexController.getParams)
router.patch('/api/params', authorize('edit:system'), indexController.updateParams);

// Graph CRUD
router.post("/api/graph", authorize('create:graph'), chartController.saveGraph);
router.put("/api/graph", authorize('edit:graph'), chartController.updateGraph);
router.patch("/api/graph", authorize('edit:graph'), chartController.patchGraph);
router.delete("/api/graph", authorize('delete:graph'), chartController.deleteGraph);

router.get("/api/getChartConfig/:id", authorize('view:dashboard'), chartController.getChartConfig);
router.post("/api/reorder", authorize('edit:graph'), chartController.reorderCharts);


export default router;