import { jest } from '@jest/globals';

const roleFind = jest.fn();

jest.unstable_mockModule('../models/role.js', () => ({
    Role: {
        find: roleFind
    }
}));

const loadAuthorization = async () => {
    jest.resetModules();
    return await import('../middleware/authorization.js');
};

describe('authorization middleware', () => {
    beforeEach(() => {
        roleFind.mockReset();
        roleFind.mockImplementation(() => ({ lean: jest.fn().mockResolvedValue([]) }));
    });

    test('getUserPermissions returns permissions for a role from config', async () => {
        const { getUserPermissions } = await loadAuthorization();

        const permissions = await getUserPermissions({ roles: ['user'] });

        expect(permissions.has('view:dashboard')).toBe(true);
        expect(permissions.has('manage:users')).toBe(false);
    });

    test('userHasPermission returns true for owner role', async () => {
        const { userHasPermission } = await loadAuthorization();

        const result = await userHasPermission({ roles: ['owner'] }, 'anything:goes');

        expect(result).toBe(true);
    });

    test('requireRole allows requests with the required role', async () => {
        const { requireRole } = await loadAuthorization();
        const req = { user: { roles: ['admin'] } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await requireRole('admin')(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('requireRole returns 403 when role is missing', async () => {
        const { requireRole } = await loadAuthorization();
        const req = { user: { roles: ['viewer'] } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await requireRole('admin')(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    test('authorize allows requests when permission exists', async () => {
        const { authorize } = await loadAuthorization();
        const req = { user: { roles: ['admin'] } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await authorize('manage:users')(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('authorize returns 403 when permission is missing', async () => {
        const { authorize } = await loadAuthorization();
        const req = { user: { roles: ['viewer'] } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await authorize('manage:users')(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    test('setTemplatePermissions sets empty permissions when no user exists', async () => {
        const { setTemplatePermissions } = await loadAuthorization();
        const req = {};
        const res = { locals: {} };
        const next = jest.fn();

        await setTemplatePermissions(req, res, next);

        expect(res.locals.user).toBeNull();
        expect(res.locals.permissions).toEqual([]);
        expect(next).toHaveBeenCalled();
    });
});