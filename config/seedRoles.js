import { Role } from '../models/role.js';
import {roles as defaultRoles} from "../constants/roles.js";

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
