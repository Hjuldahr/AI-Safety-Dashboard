import express from 'express';
import demoController from '../controllers/demoController.js';

const router = express.Router();

router.get('/', demoController.viewDefaultDemoPage);
router.get('/view/:model', demoController.viewDemoPage);
router.post('/apply', demoController.applyScenario);
router.post('/list', demoController.listScenarios);
router.post('/reset', demoController.resetScenario);

export default router;
