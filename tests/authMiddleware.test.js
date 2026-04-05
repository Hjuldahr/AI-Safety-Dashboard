import { jest } from '@jest/globals';
import { isAuthenticated } from '../middleware/authMiddleware.js';

describe('authMiddleware', () => {
    test('isAuthenticated calls next when user is authenticated', () => {
        const req = { isAuthenticated: () => true };
        const res = {};
        const next = jest.fn();

        isAuthenticated(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('isAuthenticated redirects to login when not authenticated', () => {
        const req = { isAuthenticated: () => false };
        const res = { redirect: jest.fn() };
        const next = jest.fn();

        isAuthenticated(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/login');
    });
});