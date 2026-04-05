import mongoose from 'mongoose';
import { Role } from '../models/role.js';

describe('Role model validation', () => {
    test('invalid permission values fail validation', async () => {
        const role = new Role({
            name: 'customrole',
            description: 'A custom role for testing',
            permissions: ['invalid:permission']
        });

        await expect(role.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('hasPermission returns true for an included permission', () => {
        const role = new Role({
            name: 'customrole',
            description: 'A custom role for testing',
            permissions: ['view:dashboard']
        });

        expect(role.hasPermission('view:dashboard')).toBe(true);
        expect(role.hasPermission('edit:graph')).toBe(false);
    });

    test('addPermissions and removePermissions update the permission list', () => {
        const role = new Role({
            name: 'customrole',
            description: 'A custom role for testing',
            permissions: ['view:dashboard']
        });

        role.addPermissions(['view:alerts', 'view:dashboard']);
        expect(role.permissions).toEqual(expect.arrayContaining(['view:dashboard', 'view:alerts']));

        role.removePermissions(['view:dashboard']);
        expect(role.permissions).toEqual(['view:alerts']);
    });
});