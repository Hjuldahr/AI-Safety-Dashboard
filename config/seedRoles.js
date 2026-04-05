import { Role } from '../models/role.js';
import {roles as defaultRoles} from "../constants/roles.js";

/**
 * Seeds the database with default roles
 * Only creates roles that don't already exist
 * Updates existing roles with new permissions if they differ
 * @returns {Promise<Array>} Array of created/updated role documents
 */
export async function seedDefaultRoles() {
    try {
        const createdRoles = [];
        const updatedRoles = [];

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
                // Check if permissions need updating
                const currentPerms = new Set(existingRole.permissions);
                const defaultPerms = new Set(roleData.permissions);
                
                // Check if permissions differ
                const permsEqual = currentPerms.size === defaultPerms.size && 
                    [...currentPerms].every(perm => defaultPerms.has(perm));
                
                if (!permsEqual) {
                    existingRole.permissions = roleData.permissions;
                    await existingRole.save();
                    updatedRoles.push(existingRole);
                    console.log(`✓ Updated role permissions: ${roleName}`);
                } else {
                    console.log(`✓ Role already exists: ${roleName}`);
                }
            }
        }

        console.log(`\nSeeding complete. ${createdRoles.length} new role(s) created, ${updatedRoles.length} role(s) updated.`);
        return { created: createdRoles, updated: updatedRoles };
    } catch (error) {
        console.error('Error seeding default roles:', error);
        throw error;
    }
}

export { defaultRoles };
