import { Role } from '../../models/role.js';
import { permissions } from '../permissions.js';

const defaultRoles = {
    owner: {
        description: 'Full system access',
        permissions: [
            // Owner has all permissions
            ...Object.values(permissions).flatMap(p => Object.keys(p))
        ]
    },
    admin: {
        description: 'Administrative access',
        permissions: [
            // All dashboard, alerts, reports, logs
            ...Object.keys(permissions.dashboard),
            ...Object.keys(permissions.alerts),
            ...Object.keys(permissions.reports),
            ...Object.keys(permissions.logs),
            ...Object.keys(permissions.admin),
            ...Object.keys(permissions.common),
        ]
    },
    user: {
        description: 'Standard user access',
        permissions: [
            'view:dashboard',
            'create:graph', 'edit:graph',
            'view:alerts', 'create:alert', 'acknowledge:alert',
            'view:reports', 'create:report',
            'view:logs',
            ...Object.keys(permissions.common),
        ]
    },
    viewer: {
        description: 'Read-only access',
        permissions: [
            'view:dashboard',
            'view:alerts',
            'view:reports',
            'view:logs',
            ...Object.keys(permissions.common),
        ]
    },
    visitor: {
        description: 'Limited public access',
        permissions: [
            'view:profile',
        ]
    }
};

/**
 * Seeds the database with default roles
 * Only creates roles that don't already exist
 * @returns {Promise<Array>} Array of created role documents
 */
export async function seedDefaultRoles() {
    try {
        const createdRoles = [];

        for (const [roleName, roleData] of Object.entries(defaultRoles)) {
            // Check if role already exists
            const existingRole = await Role.findOne({ name: roleName });

            if (!existingRole) {
                const newRole = new Role({
                    name: roleName,
                    description: roleData.description,
                    permissions: roleData.permissions
                });

                await newRole.save();
                createdRoles.push(newRole);
                console.log(`✓ Created role: ${roleName}`);
            } else {
                console.log(`✓ Role already exists: ${roleName}`);
            }
        }

        console.log(`\nSeeding complete. ${createdRoles.length} new role(s) created.`);
        return createdRoles;
    } catch (error) {
        console.error('Error seeding default roles:', error);
        throw error;
    }
}

export { defaultRoles };
