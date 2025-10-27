import express from 'express';
import controller from '../controllers/controlPanelController.js';

const router = express.Router();

router.post('/api/updateParams', controller.updateParams);

export default router;