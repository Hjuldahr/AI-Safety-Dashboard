import express from 'express';
import controller from '../controllers/demoController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get('/components', authorize('view:demo'), controller.renderComponentLibrary);

// apply/reset mutate live model state and use req.user — keep login required
router.post('/apply', isAuthenticated, authorize('view:demo'), controller.applyScenario);
router.post('/list', authorize('view:demo'), controller.listScenarios);
router.post('/reset', isAuthenticated, authorize('view:demo'), controller.resetScenario);

router.get('/', authorize('view:demo'), controller.viewDemoPage);

export default router;
