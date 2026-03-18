import User from '../models/user.js';
import User_Log from '../models/User_Log.js';

const ALLOWED_THEMES = new Set(['default', 'ocean', 'sunset', 'compact']);

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return null;
};

// Render profile page
export const getProfilePage = async (req, res) => {
  try {
    const safeTheme = ALLOWED_THEMES.has(req.user?.preferredTheme) ? req.user.preferredTheme : 'default';
    const safeDarkMode = Boolean(req.user?.darkModeEnabled);

    res.render('profile', {
      user: {
        ...req.user,
        preferredTheme: safeTheme,
        darkModeEnabled: safeDarkMode
      }
    });
  } catch (err) {
    console.error('Error rendering profile page:', err);
    res.status(500).send('Server error');
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { preferredTheme, darkModeEnabled } = req.body || {};
    const hasTheme = preferredTheme !== undefined;
    const hasDarkMode = darkModeEnabled !== undefined;

    if (!hasTheme && !hasDarkMode) {
      return res.status(400).json({ message: 'No preference values provided' });
    }

    const updates = {};

    if (hasTheme) {
      if (typeof preferredTheme !== 'string' || !ALLOWED_THEMES.has(preferredTheme)) {
        return res.status(400).json({ message: 'Invalid theme selection' });
      }
      updates.preferredTheme = preferredTheme;
    }

    if (hasDarkMode) {
      const parsedDarkMode = parseBoolean(darkModeEnabled);
      if (parsedDarkMode === null) {
        return res.status(400).json({ message: 'Invalid dark mode value' });
      }
      updates.darkModeEnabled = parsedDarkMode;
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    Object.assign(user, updates);
    await user.save();

    User_Log.addLog(req.user._id, 'User_Updated', 'User changed theme/preferences').catch(err => console.error('Failed to write log:', err));

    res.json({
      success: true,
      preferences: {
        preferredTheme: user.preferredTheme,
        darkModeEnabled: user.darkModeEnabled
      }
    });
  } catch (err) {
    console.error('Error updating profile preferences:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(403).json({ message: 'Current password is incorrect' });

    // Basic validation
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });

    user.password = newPassword;
    await user.save();

    User_Log.addLog(req.user._id, 'User_Updated', 'User changed own password').catch(err => console.error('Failed to write log:', err));

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { getProfilePage, changePassword, updatePreferences };