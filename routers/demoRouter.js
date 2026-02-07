import express from 'express';
import { renderDemoPage, applyScenario, resetScenario } from '../controllers/demoController.js';

const router = express.Router();

router.get('/', renderDemoPage);
router.post('/apply', applyScenario);
router.get('/list', listScenarios);
router.post('/reset', resetScenario);

export default router;
