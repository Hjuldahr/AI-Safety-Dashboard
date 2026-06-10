import express from 'express';
import { setupSSE } from '../server_side_events/scheduler.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

// Initial SSE Setup
router.get("/events", authorize('view:sse'), setupSSE);

export default router;