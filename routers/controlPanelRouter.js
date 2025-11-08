import express from 'express';
import controller from '../controllers/controlPanelController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/api/getParams", isAuthenticated, controller.getParams)

router.post('/api/updateParams', isAuthenticated, controller.updateParams);

// Graph CRUD
router.post("/api/createGraph", isAuthenticated, controller.saveGraph);
router.post("/api/updateGraph", isAuthenticated, controller.updateGraph);
router.post("/api/deleteGraph", isAuthenticated, controller.deleteGraph);


export default router;