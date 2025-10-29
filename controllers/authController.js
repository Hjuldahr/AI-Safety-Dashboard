import passport from "passport";
import User from '../models/user.js';
import User_Log from '../models/User_Log.js';

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

        // Create a new user instance. The password will be hashed automatically by the pre-save hook defined in the User model.
        const newUser = new User({ username, email, password });
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
            // If login is successful, send back a success message and user info
            User_Log.addLog(req.user._id, 'Login', `Successful login from IP: ${req.ip}`).catch(err => console.error('Failed to write log:', err));
            return res.status(200).json({
                message: 'Login successful.',
                user: { id: user.id, username: user.username, email: user.email }
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
        res.redirect("/");
    });
};

// Login Page
const getPage = async (req, res) => {
    res.render("login");
};

export default {
    signUp,
    login,
    logout,
    getPage,
}