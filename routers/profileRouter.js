import express from 'express';
import controller from '../controllers/profileController.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

// Profile page
router.get('/profile', authorize('view:profile'), controller.getProfilePage);

// API: change password
router.post('/api/profile/password', authorize('edit:profile'), controller.changePassword);

// API: update user theme/dark mode preferences
router.post('/api/profile/preferences', authorize('edit:profile'), controller.updatePreferences);

export default router;
