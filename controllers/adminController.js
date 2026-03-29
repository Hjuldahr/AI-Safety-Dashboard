import User from '../models/user.js';
import User_Log from '../models/User_Log.js';
import { Role } from '../models/role.js';
import { roles as rolesConfig } from "../constants/roles.js";
import { permissions as permissionsConfig } from "../constants/permissions.js";
import SystemSetting from '../models/SystemSetting.js';
import { AI_LOG_CUTOFF } from '../constants/sse.js';

// Render the user management page
export const getUsersPage = async (req, res) => {
  try {
    // Get all roles from database
    const dbRoles = await Role.find().select('name').lean();
    const rolesList = dbRoles.map(r => r.name);

    res.render('admin/users', {
      user: req.user,
      permissions: res.locals.permissions || [],
      rolesList
    });
  } catch (err) {
    console.error('Error rendering users page:', err);
    res.status(500).send('Server error');
  }
};

// Return JSON list of users (no passwords)
export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    res.json({ users });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a user's role (single-role set)
export const updateUserRole = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    // Validate role exists in database
    const roleExists = await Role.findOne({ name: role.toLowerCase() });
    if (!roleExists) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    // Prevent changing own role
    if (req.user && String(req.user._id) === String(targetUserId)) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    // Only owners may assign the 'owner' role
    if (role === 'owner' && !(req.user && req.user.roles.includes('owner'))) {
      return res.status(403).json({ message: 'Only owners can assign the owner role.' });
    }

    const userToUpdate = await User.findById(targetUserId);
    if (!userToUpdate) return res.status(404).json({ message: 'User not found.' });

    const previousRoles = userToUpdate.roles;
    userToUpdate.roles = [role.toLowerCase()];
    await userToUpdate.save();

    // Log the change
    User_Log.addLog(req.user._id, 'Role_Changed', `Changed roles for ${userToUpdate.username} from [${previousRoles}] to [${role}]`).catch(err => console.error('Failed to write log:', err));

    res.json({ success: true, user: { id: userToUpdate._id, username: userToUpdate.username, roles: userToUpdate.roles } });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get list of all roles from database + config roles
export const listRoles = async (req, res) => {
  try {
    const dbRoles = await Role.find().lean();
    const roles = dbRoles.map(role => ({
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isCustom: !role.isSystemRole
    }));
    res.json({ roles });
  } catch (err) {
    console.error('Error listing roles:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get available permissions
export const getAvailablePermissions = async (req, res) => {
  try {
    // Convert permissions object to grouped format with category names
    const groupedPermissions = {};
    Object.entries(permissionsConfig).forEach(([category, perms]) => {
      // Capitalize first letter of category
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      groupedPermissions[categoryName] = Object.entries(perms).map(([key, label]) => ({
        key,
        label
      }));
    });
    res.json({ permissions: groupedPermissions });
  } catch (err) {
    console.error('Error getting permissions:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new role
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    // Validate input
    if (!name || !description || !permissions) {
      return res.status(400).json({ message: 'Name, description, and permissions are required.' });
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ message: 'At least one permission is required.' });
    }

    if (name.length < 3 || name.length > 50) {
      return res.status(400).json({ message: 'Role name must be between 3 and 50 characters.' });
    }

    if (description.length < 5 || description.length > 500) {
      return res.status(400).json({ message: 'Description must be between 5 and 500 characters.' });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return res.status(409).json({ message: 'Role with this name already exists.' });
    }

    // Create new role
    const newRole = new Role({
      name: name.toLowerCase().trim(),
      description: description.trim(),
      permissions
    });

    await newRole.save();

    // Log the action
    User_Log.addLog(req.user._id, 'Role_Created', `Created new role: ${newRole.name}`).catch(err => console.error('Failed to write log:', err));

    res.status(201).json({
      success: true,
      role: {
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions,
        isCustom: true
      }
    });
  } catch (err) {
    console.error('Error creating role:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a custom role
export const deleteRole = async (req, res) => {
  try {
    const { name } = req.params;

    const role = await Role.findOne({ name: name.toLowerCase() });
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' });
    }

    if (role.isSystemRole) {
      return res.status(403).json({ message: 'System roles cannot be deleted.' });
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ roles: role.name });
    if (usersWithRole > 0) {
      return res.status(409).json({ message: `Cannot delete role. ${usersWithRole} user(s) still have this role.` });
    }

    await Role.deleteOne({ _id: role._id });

    // Log the action
    User_Log.addLog(req.user._id, 'Role_Deleted', `Deleted role: ${role.name}`).catch(err => console.error('Failed to write log:', err));

    res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (err) {
    console.error('Error deleting role:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a user account
export const deleteUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // Prevent deleting self
    if (req.user && String(req.user._id) === String(targetUserId)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const userToDelete = await User.findById(targetUserId);
    if (!userToDelete) return res.status(404).json({ message: 'User not found.' });

    // If target is an owner, only allow owners to delete
    if (userToDelete.roles && userToDelete.roles.includes('owner')) {
      if (!(req.user && req.user.roles && req.user.roles.includes('owner'))) {
        return res.status(403).json({ message: 'Only owners can delete owner accounts.' });
      }

      // Prevent deleting the last owner
      const ownerCount = await User.countDocuments({ roles: 'owner' });
      if (ownerCount <= 1) {
        return res.status(409).json({ message: 'Cannot delete the last owner account.' });
      }
    }

    await User.deleteOne({ _id: userToDelete._id });

    // Log the deletion
    User_Log.addLog(req.user._id, 'User_Deleted', `Deleted user account: ${userToDelete.username}`).catch(err => console.error('Failed to write log:', err));

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get the current AI log cutoff setting
export const getSystemSettings = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: 'ai_log_cutoff' }).lean();
    const aiLogCutoff = (setting && typeof setting.value === 'number') ? setting.value : AI_LOG_CUTOFF;
    res.json({ aiLogCutoff });
  } catch (err) {
    console.error('Error fetching system settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update the AI log cutoff setting
export const updateAiLogCutoff = async (req, res) => {
  try {
    const { value } = req.body;

    if (typeof value !== 'number' || value <= 0) {
      return res.status(400).json({ message: 'Invalid cutoff value.' });
    }

    await SystemSetting.findOneAndUpdate(
      { key: 'ai_log_cutoff' },
      { key: 'ai_log_cutoff', value },
      { upsert: true }
    );

    User_Log.addLog(req.user._id, 'Setting_Changed', `Changed AI log cutoff to ${value}ms`).catch(err => console.error('Failed to write log:', err));

    res.json({ success: true, aiLogCutoff: value });
  } catch (err) {
    console.error('Error updating AI log cutoff:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default {
  getUsersPage,
  listUsers,
  updateUserRole,
  listRoles,
  getAvailablePermissions,
  createRole,
  deleteRole,
  deleteUser,
  getSystemSettings,
  updateAiLogCutoff
};