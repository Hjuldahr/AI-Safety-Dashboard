import { jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockSave = jest.fn();
const mockAddLog = jest.fn().mockResolvedValue();
const mockAuthenticate = jest.fn();

jest.unstable_mockModule('../models/user.js', () => {
    const UserMock = jest.fn().mockImplementation(function (data) {
        this._id = 'mock-id';
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.save = mockSave;
    });
    UserMock.findOne = mockFindOne;
    return {
        default: UserMock
    };
});

jest.unstable_mockModule('../models/User_Log.js', () => ({
    default: {
        addLog: mockAddLog
    }
}));

jest.unstable_mockModule('passport', () => ({
    default: {
        authenticate: mockAuthenticate
    }
}));

let authController;

beforeEach(async () => {
    mockFindOne.mockReset();
    mockSave.mockClear();
    mockAddLog.mockClear();
    mockAddLog.mockResolvedValue();
    mockAuthenticate.mockClear();
    jest.resetModules();
    authController = (await import('../controllers/authController.js')).default;
});

describe('authController', () => {

    test('signUp returns 409 when user already exists', async () => {
        mockFindOne.mockResolvedValue({ username: 'exists' });
        const req = { body: { username: 'bob', email: 'bob@example.com', password: 'secret' }, ip: '127.0.0.1' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await authController.signUp(req, res);

        expect(mockFindOne).toHaveBeenCalledWith({ $or: [{ email: 'bob@example.com' }, { username: 'bob' }] });
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: 'Username or email already exists.' });
    });

    test('signUp creates a new user and returns 201', async () => {
        mockFindOne.mockResolvedValue(null);
        mockSave.mockResolvedValue({ _id: 'mock-id' });
        const req = { body: { username: 'bob', email: 'bob@example.com', password: 'secret' }, ip: '127.0.0.1' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await authController.signUp(req, res);

        expect(mockFindOne).toHaveBeenCalled();
        expect(mockSave).toHaveBeenCalled();
        expect(mockAddLog).toHaveBeenCalledWith('mock-id', 'Signup', expect.stringContaining('Successful signup from IP'));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ message: 'User created successfully. Please log in.' });
    });

    test('login returns 401 when authentication fails', () => {
        const req = { body: {}, session: {}, login: jest.fn(), ip: '127.0.0.1' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        mockAuthenticate.mockImplementation((strategy, callback) => (reqArg, resArg, nextArg) => {
            callback(null, false, { message: 'Bad credentials' });
        });

        authController.login(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Bad credentials' });
    });

    test('logout logs out user and redirects to base path', () => {
        const req = { user: { _id: 'mock-id' }, logout: jest.fn((cb) => cb()), ip: '127.0.0.1' };
        const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        authController.logout(req, res, next);

        expect(mockAddLog).toHaveBeenCalledWith('mock-id', 'Logout', 'User logged out.');
        expect(req.logout).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/');
    });
});