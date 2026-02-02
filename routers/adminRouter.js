import express from 'express';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';
import controller from '../controllers/adminController.js';

const router = express.Router();

// Page
router.get('/users', isAuthenticated, authorize('manage:users'), controller.getUsersPage);

// API: list users
router.get('/api/users', isAuthenticated, authorize('manage:users'), controller.listUsers);

// API: update user role
router.patch('/api/users/:id/roles', isAuthenticated, authorize('manage:roles'), controller.updateUserRole);

export default router;