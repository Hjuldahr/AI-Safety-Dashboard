import User from '../models/user.js';
import User_Log from '../models/User_Log.js';
import { roles as rolesConfig } from '../config/roles.js';

// Render the user management page
export const getUsersPage = async (req, res) => {
  try {
    // roles list from config
    const rolesList = Object.keys(rolesConfig);

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

    // Validate role
    const roleKeys = Object.keys(rolesConfig);
    if (!roleKeys.includes(role)) {
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
    userToUpdate.roles = [role];
    await userToUpdate.save();

    // Log the change
    User_Log.addLog(req.user._id, 'Role_Changed', `Changed roles for ${userToUpdate.username} from [${previousRoles}] to [${role}]`).catch(err => console.error('Failed to write log:', err));

    res.json({ success: true, user: { id: userToUpdate._id, username: userToUpdate.username, roles: userToUpdate.roles } });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default {
  getUsersPage,
  listUsers,
  updateUserRole
};