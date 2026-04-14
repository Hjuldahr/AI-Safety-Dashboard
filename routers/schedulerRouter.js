import express from 'express';
import { setupSSE } from '../server_side_events/scheduler.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Initial SSE Setup
router.get("/events", isAuthenticated, setupSSE);

export default router;