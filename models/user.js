import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { roles as systemRoles } from '../constants/roles.js';

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
        default: ['viewer'], // Every new user is a 'viewer' by default
        validate: {
            validator: async function(rolesArr) {
                // Check each role against system roles and DB roles
                const systemRoleNames = Object.keys(systemRoles);
                for (const roleName of rolesArr) {
                    if (systemRoleNames.includes(roleName)) continue;
                    // Check if a custom role exists in the DB
                    const Role = mongoose.model('Role');
                    const exists = await Role.findOne({ name: roleName }).lean();
                    if (!exists) return false;
                }
                return true;
            },
            message: 'One or more invalid role names provided'
        }
    },
    preferredTheme: {
        type: String,
        enum: ['default', 'ocean', 'sunset', 'viridian', 'sakura', 'cosmic', 'contrast', 'compact'],
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
    },

    // ----- Forced-reset OTP fields -----
    // bcrypt hash of a one-time password issued by an admin (never stored in plain text)
    otpHash: {
        type: String,
        default: null
    },
    // UTC expiry for the OTP (24 h from generation)
    otpExpiresAt: {
        type: Date,
        default: null
    },
    // When true the user must set a new password before accessing the app
    mustResetPassword: {
        type: Boolean,
        default: false
    },

    // ----- Account lock -----
    // When true the account cannot be used to log in (without deleting the account)
    isLocked: {
        type: Boolean,
        default: false
    },

    // Timestamp of the user's most recent successful login
    lastLoginAt: {
        type: Date,
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