import express from 'express';
import { renderDemoPage, applyScenario, resetScenario, listScenarios, renderComponentLibrary } from '../controllers/demoController.js';

const router = express.Router();

router.get('/', renderDemoPage);
router.get('/components', renderComponentLibrary);
router.post('/apply', applyScenario);
router.post('/list', listScenarios);
router.post('/reset', resetScenario);

export default router;
