import express from 'express';
import controller from '../controllers/demoController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get('/components', isAuthenticated, authorize('view:demo'), controller.renderComponentLibrary);

router.post('/apply', isAuthenticated, authorize('view:demo'), controller.applyScenario);
router.post('/list', isAuthenticated, authorize('view:demo'), controller.listScenarios);
router.post('/reset', isAuthenticated, authorize('view:demo'), controller.resetScenario);

router.get('/', isAuthenticated, authorize('view:demo'), controller.viewDemoPage);

export default router;
