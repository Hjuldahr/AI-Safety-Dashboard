import express from 'express';
import { authorize } from '../middleware/authorization.js';
import controller from '../controllers/adminController.js';

const router = express.Router();

// Page
router.get('/users', authorize('manage:users'), controller.getUsersPage);

// API: list users
router.get('/api/users', authorize('manage:users'), controller.listUsers);

// API: update user role
router.patch('/api/users/:id/roles', authorize('manage:roles'), controller.updateUserRole);

// API: list roles
router.get('/api/roles', authorize('manage:roles'), controller.listRoles);

// API: get available permissions
router.get('/api/permissions', authorize('manage:roles'), controller.getAvailablePermissions);

// API: create new role
router.post('/api/roles', authorize('manage:roles'), controller.createRole);

// API: delete a role
router.delete('/api/roles/:name', authorize('manage:roles'), controller.deleteRole);

// API: delete a user
router.delete('/api/users/:id', authorize('manage:users'), controller.deleteUser);

// API: force password reset OTP for a user
router.post('/api/users/:id/otp', authorize('manage:users'), controller.generateOtp);

// API: toggle account lock
router.patch('/api/users/:id/lock', authorize('manage:users'), controller.toggleUserLock);

// API: admin-create a new user
router.post('/api/users', authorize('manage:users'), controller.createUser);

// API: system settings
router.get('/api/settings', authorize('view:system'), controller.getSystemSettings);
router.put('/api/settings/ai-log-cutoff', authorize('edit:system'), controller.updateAiLogCutoff);
router.put('/api/settings/default-theme', authorize('edit:system'), controller.updateDefaultTheme);
router.put('/api/settings/registration', authorize('edit:system'), controller.updateRegistrationSetting);
router.post('/api/settings/shutdown', authorize('shutdown:server'), controller.shutdownServer);
router.post('/api/settings/restart', authorize('restart:server'), controller.restartServer);

export default router;