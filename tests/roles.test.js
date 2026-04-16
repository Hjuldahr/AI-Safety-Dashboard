import { roles } from '../constants/roles.js';
import { permissions } from '../constants/permissions.js';

describe('Roles', () => {
    test('owner role should have all permissions', () => {
        const allPermissions = Object.values(permissions).flatMap(p => Object.keys(p));
        expect(roles.owner.permissions).toEqual(expect.arrayContaining(allPermissions));
        expect(roles.owner.permissions.length).toBeGreaterThan(0);
    });

    test('admin role should have expected permissions', () => {
        const expectedPermissions = [
            ...Object.keys(permissions.dashboard),
            ...Object.keys(permissions.alerts),
            ...Object.keys(permissions.reports),
            ...Object.keys(permissions.logs),
            ...Object.keys(permissions.admin),
            ...Object.keys(permissions.common),
            ...Object.keys(permissions.documentation),
            ...Object.keys(permissions.demo),
        ];

        expect(roles.admin.permissions).toEqual(expect.arrayContaining(expectedPermissions));
    });

    test('user role should have limited permissions', () => {
        expect(roles.user.permissions).toContain('view:dashboard');
        expect(roles.user.permissions).toContain('view:alerts');
        expect(roles.user.permissions).toContain('create:report');
        expect(roles.user.permissions).not.toContain('manage:users');
    });

    test('viewer role should have read-only permissions', () => {
        expect(roles.viewer.permissions).toContain('view:dashboard');
        expect(roles.viewer.permissions).toContain('view:alerts');
        expect(roles.viewer.permissions).toContain('view:reports');
        expect(roles.viewer.permissions).not.toContain('edit:graph');
        expect(roles.viewer.permissions).not.toContain('create:alert');
    });

    test('visitor role should have minimal permissions', () => {
        expect(roles.visitor.permissions).toEqual(['view:dashboard', 'view:profile', 'edit:profile', 'read:docs']);
    });

    test('all roles should have descriptions', () => {
        Object.values(roles).forEach(role => {
            expect(role.description).toBeDefined();
            expect(typeof role.description).toBe('string');
            expect(role.description.length).toBeGreaterThan(0);
        });
    });

    test('all roles should have permissions array', () => {
        Object.values(roles).forEach(role => {
            expect(Array.isArray(role.permissions)).toBe(true);
            expect(role.permissions.length).toBeGreaterThan(0);
        });
    });
});