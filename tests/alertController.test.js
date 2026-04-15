import { jest } from '@jest/globals';

const mockAlertFind = jest.fn();
const mockAILogDistinct = jest.fn();

jest.unstable_mockModule('../models/alert_model.js', () => ({
    default: {
        find: mockAlertFind
    }
}));

jest.unstable_mockModule('../models/AI_Log.js', () => ({
    default: {
        distinct: mockAILogDistinct
    }
}));

let alertController;

beforeEach(async () => {
    mockAlertFind.mockClear();
    mockAILogDistinct.mockClear();
    jest.resetModules();
    alertController = (await import('../controllers/alertController.js')).default;
});

describe('alertController', () => {
    test('getPage renders alerts page with data', async () => {
        const mockAlerts = [{ _id: 'alert1', name: 'Test Alert' }];
        const mockModels = ['GoodModel', 'BadModel'];

        mockAlertFind.mockResolvedValue(mockAlerts);
        mockAILogDistinct.mockResolvedValue(mockModels);

        const req = { user: { username: 'testuser' } };
        const res = { render: jest.fn() };

        await alertController.getPage(req, res);

        expect(mockAlertFind).toHaveBeenCalled();
        expect(mockAILogDistinct).toHaveBeenCalledWith('modelName');
        expect(res.render).toHaveBeenCalledWith('alerts', {
            user: { username: 'testuser' },
            alerts: mockAlerts,
            alertLogs: [],
            models: mockModels,
            constants: expect.any(Object),
            deepLink: null,
        });
    });

    test('getPage handles AI_Log distinct error gracefully', async () => {
        mockAlertFind.mockResolvedValue([]);
        mockAILogDistinct.mockRejectedValue(new Error('DB error'));

        const req = { user: { username: 'testuser' } };
        const res = { render: jest.fn() };

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await alertController.getPage(req, res);
        consoleErrorSpy.mockRestore();

        expect(res.render).toHaveBeenCalledWith('alerts', {
            user: { username: 'testuser' },
            alerts: [],
            alertLogs: [],
            models: [],
            constants: expect.any(Object),
            deepLink: null,
        });
    });

    test('getAlertHistory returns paginated alert history', async () => {
        const mockAlertLogs = [
            { _id: 'log1', alertSnapshot: { alertLevel: 'high' } },
            { _id: 'log2', alertSnapshot: { alertLevel: 'medium' } }
        ];

        const mockAlertLogFind = jest.fn();
        const mockSort = jest.fn();
        const mockSkip = jest.fn();
        const mockLimit = jest.fn();
        const mockPopulate = jest.fn();
        const mockLean = jest.fn().mockResolvedValue(mockAlertLogs);
        const mockCountDocuments = jest.fn().mockResolvedValue(25);

        jest.unstable_mockModule('../models/alert_log.js', () => ({
            default: {
                find: mockAlertLogFind,
                countDocuments: mockCountDocuments
            }
        }));

        // Mock the chain methods
        mockAlertLogFind.mockReturnValue({
            sort: mockSort.mockReturnThis(),
            skip: mockSkip.mockReturnThis(),
            limit: mockLimit.mockReturnThis(),
            populate: mockPopulate.mockReturnThis(),
            lean: mockLean
        });

        const req = {
            query: {
                page: '2',
                limit: '10',
                level: 'high',
                modelName: 'GoodModel',
                startDate: '2024-01-01',
                endDate: '2024-01-31'
            }
        };
        const res = { 
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        // Re-import to get the mocked module
        jest.resetModules();
        const controller = await import('../controllers/alertController.js');
        const { getAlertHistory } = controller.default;

        await getAlertHistory(req, res);

        expect(mockAlertLogFind).toHaveBeenCalled();
        expect(mockSort).toHaveBeenCalledWith({ timestamp: -1 });
        expect(mockSkip).toHaveBeenCalledWith(10);
        expect(mockLimit).toHaveBeenCalledWith(10);
        expect(mockCountDocuments).toHaveBeenCalled();

        expect(res.json).toHaveBeenCalledWith({
            logs: expect.any(Array),
            total: 25,
            page: 2,
            pages: 3
        });
    });
});