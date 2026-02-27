import User from '../models/user.js';
import User_Log from '../models/User_Log.js';

// Render profile page
export const getProfilePage = async (req, res) => {
  try {
    res.render('profile', { user: req.user });
  } catch (err) {
    console.error('Error rendering profile page:', err);
    res.status(500).send('Server error');
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

export default { getProfilePage, changePassword };