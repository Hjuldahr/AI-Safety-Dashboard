import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true // Removes whitespace
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true, // Stores emails in lowercase
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    roles: {
        type: [String],
        default: ['viewer'] // Every new user is a 'viewer' by default
    },
    preferredTheme: {
        type: String,
        enum: ['default', 'ocean', 'sunset', 'viridian', 'sakura', 'cosmic', 'noctis', 'contrast', 'compact'],
        default: 'default'
    },
    preferredColour: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
    },
    // Timestamp of when user last saw notifications (server-side unread tracking)
    notificationsLastSeen: {
        type: Date,
        required: false,
        default: null
    }
}, { timestamps: true }); 

// pre-save hook - It runs automatically before a user is saved to the DB to hash the password so we never store plain-text passwords.
UserSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    } 

    try {
        // Generate a "salt" and hash the password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

UserSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;