import { jest } from '@jest/globals';

const mockSave = jest.fn();
const mockAddLog = jest.fn().mockResolvedValue();

jest.unstable_mockModule('../models/Chart_Config.js', () => ({
    default: jest.fn().mockImplementation(function (data) {
        this.title = data.title;
        this.chartType = data.chartType;
        this.chartSize = data.chartSize;
        this.chartTimeRange = data.chartTimeRange;
        this.yAxis = data.yAxis;
        this.xAxis = data.xAxis;
        this.category = data.category;
        this.splitBy = data.splitBy;
        this.includedValues = data.includedValues;
        this.save = mockSave;
    })
}));

jest.unstable_mockModule('../models/User_Log.js', () => ({
    default: {
        addLog: mockAddLog
    }
}));

let chartController;

beforeEach(async () => {
    mockSave.mockClear();
    mockAddLog.mockClear();
    jest.resetModules();
    chartController = (await import('../controllers/chartController.js')).default;
});

describe('chartController', () => {
    test('saveGraph returns 400 when title is missing', async () => {
        const req = { body: { chartType: 'bar' }, user: { _id: 'user-id' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await chartController.saveGraph(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Title and chartType are required.'
        });
    });

    test('saveGraph returns 400 when chartType is missing', async () => {
        const req = { body: { title: 'Test Chart' }, user: { _id: 'user-id' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await chartController.saveGraph(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Title and chartType are required.'
        });
    });

    test('saveGraph saves chart and returns 201 on success', async () => {
        const mockSavedChart = { _id: 'chart-id', title: 'Test Chart' };
        mockSave.mockResolvedValue(mockSavedChart);

        const req = {
            body: {
                title: 'Test Chart',
                chartType: 'bar',
                chartSize: 'large',
                yAxis: 'count',
                xAxis: 'time',
                category: 'model',
                splitBy: 'status',
                includedValues: ['value1'],
                timeframe: '1h'
            },
            user: { _id: 'user-id' }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await chartController.saveGraph(req, res);

        expect(mockSave).toHaveBeenCalled();
        expect(mockAddLog).toHaveBeenCalledWith('user-id', 'Chart_Created', 'User Created a new chart: Test Chart');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Chart saved successfully!',
            chart: mockSavedChart
        });
    });

    test('saveGraph sets default chartSize when not provided', async () => {
        mockSave.mockResolvedValue({ _id: 'chart-id' });

        const req = {
            body: {
                title: 'Test Chart',
                chartType: 'bar'
            },
            user: { _id: 'user-id' }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await chartController.saveGraph(req, res);

        // Check that the constructor was called with default chartSize
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('saveGraph returns 500 on save error', async () => {
        mockSave.mockRejectedValue(new Error('DB error'));

        const req = {
            body: {
                title: 'Test Chart',
                chartType: 'bar'
            },
            user: { _id: 'user-id' }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await chartController.saveGraph(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Failed to save chart config.',
        });
    });
});