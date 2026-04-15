import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';

describe('User model validation', () => {
    test('username is normalized to lowercase when set', () => {
        const user = new User({ username: 'TestUser', email: 'test@example.com', password: 'secret' });

        expect(user.username).toBe('testuser');
    });

    test('missing required email fails validation', async () => {
        const user = new User({ username: 'testuser', password: 'secret' });

        await expect(user.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('invalid preferredTheme fails validation', async () => {
        const user = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: 'secret',
            preferredTheme: 'not-a-theme'
        });

        await expect(user.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('comparePassword resolves true for a matching hashed password', async () => {
        const hash = await bcrypt.hash('secret', 10);
        const user = new User({ username: 'testuser', email: 'test@example.com', password: hash });

        await expect(user.comparePassword('secret')).resolves.toBe(true);
    });

    test('preferredColour enum contains expected values', () => {
        expect(User.schema.path('preferredColour').enumValues).toEqual(['light', 'dark', 'auto']);
    });
});