import { permissions } from '../constants/permissions.js';

describe('Permissions', () => {
    test('permissions should be an object with expected categories', () => {
        expect(typeof permissions).toBe('object');
        expect(permissions).toHaveProperty('common');
        expect(permissions).toHaveProperty('dashboard');
        expect(permissions).toHaveProperty('alerts');
        expect(permissions).toHaveProperty('reports');
        expect(permissions).toHaveProperty('logs');
        expect(permissions).toHaveProperty('admin');
        expect(permissions).toHaveProperty('documentation');
        expect(permissions).toHaveProperty('demo');
    });

    test('each permission category should be an object', () => {
        Object.values(permissions).forEach(category => {
            expect(typeof category).toBe('object');
            expect(category).not.toBe(null);
        });
    });

    test('permission keys should follow naming convention', () => {
        const allPermissions = Object.values(permissions).flatMap(p => Object.keys(p));
        allPermissions.forEach(permission => {
            expect(permission).toMatch(/^[a-z]+:[a-z_]+$/);
        });
    });

    test('permission values should be descriptive strings', () => {
        const allPermissions = Object.values(permissions).flatMap(p => Object.values(p));
        allPermissions.forEach(description => {
            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);
        });
    });

    test('dashboard permissions should include CRUD operations', () => {
        expect(permissions.dashboard).toHaveProperty('view:dashboard');
        expect(permissions.dashboard).toHaveProperty('create:graph');
        expect(permissions.dashboard).toHaveProperty('edit:graph');
        expect(permissions.dashboard).toHaveProperty('delete:graph');
    });

    test('alerts permissions should include management operations', () => {
        expect(permissions.alerts).toHaveProperty('view:alerts');
        expect(permissions.alerts).toHaveProperty('create:alert');
        expect(permissions.alerts).toHaveProperty('manage:alert_rules');
    });

    test('admin permissions should include user management', () => {
        expect(permissions.admin).toHaveProperty('manage:users');
        expect(permissions.admin).toHaveProperty('manage:roles');
        expect(permissions.admin).toHaveProperty('edit:system');
    });
});