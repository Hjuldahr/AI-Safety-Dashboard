import express from 'express';
import controller from '../controllers/demoController.js';

const router = express.Router();

router.get('/components', controller.renderComponentLibrary);

router.post('/apply', controller.applyScenario);
router.post('/list', controller.listScenarios);
router.post('/reset', controller.resetScenario);

router.get('/', controller.viewDemoPage);

export default router;
