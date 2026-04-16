import passport from "passport";
import User from '../models/user.js';
import User_Log from '../models/User_Log.js';
import Settings from '../models/settings.js';

const BASE = process.env.PUBLIC_URL || '/';

// --- Sign Up ---
const signUp = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if a user with this email or username already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            // Send a 409 Conflict status and a JSON error message
            return res.status(409).json({ message: 'Username or email already exists.' });
        }

        // Get default theme for new accounts
        const defaultTheme = await Settings.get('default_theme', 'default');

        // Create a new user instance. The password will be hashed automatically by the pre-save hook defined in the User model.
        const newUser = new User({ username, email, password, preferredTheme: defaultTheme });
        await newUser.save();

        await User_Log.addLog(newUser._id, 'Signup', `Successful signup from IP: ${req.ip}`);
        res.status(201).json({ message: 'User created successfully. Please log in.' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

// --- Login ---
const login = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            // Handle system errors (e.g., database connection issue)
            return next(err);
        }
        if (!user) {
            // Handle failed login (e.g., wrong password, user not found)
            // 'info' contains the message from our passport-config, like 'Password incorrect'
            return res.status(401).json({ message: info.message || 'Authentication failed.' });
        }
        // req.login() is a Passport function that establishes the session.
        req.login(user, (err) => {
            if (err) {
                return next(err);
            }

            req.session.save((err) => {
                User_Log.addLog(req.user._id, 'Login', `Successful login from IP: ${req.ip}`).catch(err => console.error('Failed to write log:', err));

                // If the user must change their password (forced reset via OTP), signal the client
                if (req.user.mustResetPassword) {
                    return res.status(200).json({
                        message: 'Login successful. Password reset required.',
                        mustReset: true,
                        user: { id: user.id, username: user.username, email: user.email }
                    });
                }

                return res.status(200).json({
                    message: 'Login successful.',
                    user: { id: user.id, username: user.username, email: user.email }
                });
            });
        });
    })(req, res, next);
};

// Handles logging the user out
const logout = (req, res, next) => {
    User_Log.addLog(req.user._id, 'Logout', 'User logged out.').catch(err => console.error('Failed to write log:', err));
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Logout failed.' });
        }
        res.redirect(BASE);
    });
};

// Login Page
const getPage = async (req, res) => {

    if (Object.keys(req.query).length > 0) {
        // Redirect to the same path but without the search string
        return res.redirect(req.path);
    }
    
    res.render("login");
};

// --- Force-Reset Password (used after OTP login) ---
const resetPassword = async (req, res) => {
    try {
        // Must be logged in AND flagged for reset
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({ message: 'Not authenticated.' });
        }

        // Fetch a fresh copy from DB (req.user may be from session cache)
        const dbUser = await User.findById(req.user._id);
        if (!dbUser || !dbUser.mustResetPassword) {
            return res.status(403).json({ message: 'No password reset required for this account.' });
        }

        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }

        // Set the new password — the pre-save hook will hash it
        dbUser.password = newPassword;
        dbUser.mustResetPassword = false;
        dbUser.otpHash = null;
        dbUser.otpExpiresAt = null;
        await dbUser.save();

        User_Log.addLog(dbUser._id, 'Password_Reset', 'User completed forced password reset.').catch(err => console.error('Failed to write log:', err));

        res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

export default {
    signUp,
    login,
    logout,
    getPage,
    resetPassword,
}