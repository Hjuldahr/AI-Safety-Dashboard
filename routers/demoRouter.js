import express from 'express';
import { renderDemoPage, goRogue, resetModel } from '../controllers/demoController.js';

const router = express.Router();

router.get('/', renderDemoPage);
router.post('/rogue', goRogue);
router.post('/reset', resetModel);

export default router;
