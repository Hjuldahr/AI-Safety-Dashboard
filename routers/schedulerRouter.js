import express from 'express';
import { setupSSE } from '../server_side_events/scheduler.js';

const router = express.Router();

// Initial SSE Setup
router.get("/events", setupSSE);

export default router;