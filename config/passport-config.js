import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/user.js'; // Import our User model

function initialize(passport) {

    // Lets users log in with either username or password.
    const authenticateUser = async (username, password, done) => {
        // The 'username' field from the form can be either an email or a username.
        // We make it lowercase to ensure case-insensitive matching.
        const loginIdentifier = username.toLowerCase();

        try {
            // Find a user whose email OR username matches the login identifier.
            const user = await User.findOne({
                $or: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            });

            if (!user) {
                return done(null, false, { message: 'No user with that email or username' });
            }

            const isMatch = await user.comparePassword(password);

            if (isMatch) {
                return done(null, user); // Pass the user object to Passport.
            } else {
                // Passwords do not match.
                return done(null, false, { message: 'Password incorrect' });
            }
        } catch (error) {
            // An error occurred while querying the database.
            return done(error);
        }
    };

    passport.use(new LocalStrategy({ usernameField: 'username' }, authenticateUser));

    // Determines what user data should be stored in the session.
    // We only need to store the user's unique ID.
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Retrieves the full user data based on the ID stored in the session.
    // This runs on every request for a logged-in user
   passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).lean();
        if (!user) {
            return done(null, false);
        }

        done(null, user); // The full user object is now available as req.user

    } catch (err) {
        done(err);
    }
});
}

export default initialize;
