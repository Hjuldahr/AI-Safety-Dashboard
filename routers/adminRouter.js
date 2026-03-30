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

// API: list roles
router.get('/api/roles', isAuthenticated, authorize('manage:roles'), controller.listRoles);

// API: get available permissions
router.get('/api/permissions', isAuthenticated, authorize('manage:roles'), controller.getAvailablePermissions);

// API: create new role
router.post('/api/roles', isAuthenticated, authorize('manage:roles'), controller.createRole);

// API: delete a role
router.delete('/api/roles/:name', isAuthenticated, authorize('manage:roles'), controller.deleteRole);

// API: delete a user
router.delete('/api/users/:id', isAuthenticated, authorize('manage:users'), controller.deleteUser);

// API: system settings
router.get('/api/settings', isAuthenticated, authorize('manage:users'), controller.getSystemSettings);
router.put('/api/settings/ai-log-cutoff', isAuthenticated, authorize('manage:users'), controller.updateAiLogCutoff);
router.put('/api/settings/default-theme', isAuthenticated, authorize('manage:users'), controller.updateDefaultTheme);

export default router;