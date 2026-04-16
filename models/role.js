import mongoose from 'mongoose';
import { permissions } from '../constants/permissions.js';

// Get all valid permission keys
const validPermissions = Object.values(permissions).flatMap(p => Object.keys(p));

const RoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        unique: true, //automatically indexed
        lowercase: true,
        trim: true,
        minlength: [3, 'Role name must be at least 3 characters'],
        maxlength: [50, 'Role name cannot exceed 50 characters']
    },
    description: {
        type: String,
        required: [true, 'Role description is required'],
        trim: true,
        minlength: [5, 'Description must be at least 5 characters'],
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    permissions: {
        type: [String],
        required: [true, 'At least one permission is required'],
        validate: {
            validator: function(perms) {
                // Ensure all permissions are valid
                return perms.every(p => validPermissions.includes(p));
            },
            message: 'One or more invalid permissions provided'
        }
    },
    isSystemRole: {
        type: Boolean,
        default: false // System roles (owner, admin) cannot be deleted
    }
}, { timestamps: true });

// Prevent system roles from being modified
RoleSchema.pre('save', async function(next) {
    const systemRoles = ['owner', 'admin', 'user', 'viewer', 'visitor'];
    
    if (systemRoles.includes(this.name)) {
        this.isSystemRole = true;
    }
    
    next();
});

// Override update methods to prevent system role modification
RoleSchema.pre('findByIdAndUpdate', async function(next) {
    const doc = await this.model.findOne(this.getFilter());
    if (doc && doc.isSystemRole) {
        throw new Error('System roles cannot be modified');
    }
    next();
});

RoleSchema.pre('findOneAndUpdate', async function(next) {
    const doc = await this.model.findOne(this.getFilter());
    if (doc && doc.isSystemRole) {
        throw new Error('System roles cannot be modified');
    }
    next();
});

RoleSchema.pre('updateOne', async function(next) {
    const doc = await this.model.findOne(this.getFilter());
    if (doc && doc.isSystemRole) {
        throw new Error('System roles cannot be modified');
    }
    next();
});

// Method to check if a role has a specific permission
RoleSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission);
};

// Method to add permissions
RoleSchema.methods.addPermissions = function(permsToAdd) {
    const newPerms = [...new Set([...this.permissions, ...permsToAdd])];
    this.permissions = newPerms;
    return this;
};

// Method to remove permissions
RoleSchema.methods.removePermissions = function(permsToRemove) {
    this.permissions = this.permissions.filter(p => !permsToRemove.includes(p));
    return this;
};

// Static method to get all valid permissions
RoleSchema.statics.getValidPermissions = function() {
    return validPermissions;
};

// Prevent deletion of system roles
RoleSchema.pre('findByIdAndDelete', async function(next) {
    const doc = await this.model.findOne(this.getFilter());
    if (doc && doc.isSystemRole) {
        throw new Error('System roles cannot be deleted');
    }
    next();
});

RoleSchema.pre('findOneAndDelete', async function(next) {
    const doc = await this.model.findOne(this.getFilter());
    if (doc && doc.isSystemRole) {
        throw new Error('System roles cannot be deleted');
    }
    next();
});

RoleSchema.pre('deleteOne', { document: false, query: true }, async function(next) {
    const doc = await this.model.findOne(this.getFilter());
    if (doc && doc.isSystemRole) {
        throw new Error('System roles cannot be deleted');
    }
    next();
});

const Role = mongoose.model('Role', RoleSchema);

export { Role };