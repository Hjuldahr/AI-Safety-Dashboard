import express from 'express';
import { renderDemoPage, applyScenario, resetScenario, listScenarios } from '../controllers/demoController.js';

const router = express.Router();

router.get('/', renderDemoPage);
router.post('/apply', applyScenario);
router.post('/list', listScenarios);
router.post('/reset', resetScenario);

export default router;
