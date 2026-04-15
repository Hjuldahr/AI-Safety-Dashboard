import { NOTIFICATION_TYPES, SHUTDOWN_MESSAGE } from '../constants/notification.js';

describe('Notification Constants', () => {
    test('NOTIFICATION_TYPES should have expected values', () => {
        expect(NOTIFICATION_TYPES.Generic).toBe('generic');
        expect(NOTIFICATION_TYPES.Alert).toBe('alert');
        expect(NOTIFICATION_TYPES.Demo).toBe('demo');
        expect(NOTIFICATION_TYPES.User).toBe('user');
        expect(NOTIFICATION_TYPES.Server).toBe('server');
    });

    test('NOTIFICATION_TYPES should be frozen', () => {
        expect(Object.isFrozen(NOTIFICATION_TYPES)).toBe(true);
    });

    test('SHUTDOWN_MESSAGE should have correct structure', () => {
        expect(SHUTDOWN_MESSAGE).toHaveProperty('message', 'The Server is now shutting down');
        expect(SHUTDOWN_MESSAGE).toHaveProperty('category', NOTIFICATION_TYPES.Server);
        expect(SHUTDOWN_MESSAGE).toHaveProperty('dismissible', false);
        expect(SHUTDOWN_MESSAGE).toHaveProperty('timeout', null);
        expect(SHUTDOWN_MESSAGE).toHaveProperty('colour', 'shutdown');
    });

    test('SHUTDOWN_MESSAGE category should match Server type', () => {
        expect(SHUTDOWN_MESSAGE.category).toBe('server');
    });
});