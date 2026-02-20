import express from 'express';
import controller from '../controllers/profileController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Profile page
router.get('/profile', isAuthenticated, controller.getProfilePage);

// API: change password
router.post('/api/profile/password', isAuthenticated, controller.changePassword);

export default router;
