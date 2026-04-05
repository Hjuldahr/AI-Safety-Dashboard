import { jest } from '@jest/globals';
import { AI_LOG_CUTOFF } from '../constants/sse.js';

// Mock the SystemSetting model
const mockFindOne = jest.fn();
jest.unstable_mockModule('../models/SystemSetting.js', () => ({
    default: {
        findOne: mockFindOne
    }
}));

describe('getAiLogCutoff', () => {
    let getAiLogCutoff;

    beforeEach(async () => {
        mockFindOne.mockClear();
        // Reset the mock to return a chainable object with lean method
        mockFindOne.mockReturnValue({
            lean: jest.fn()
        });
        jest.resetModules();
        const module = await import('../helpers/getAiLogCutoff.js');
        getAiLogCutoff = module.getAiLogCutoff;
    });

    test('should return custom value when setting exists', async () => {
        const customValue = 3600000; // 1 hour in ms
        const mockLean = jest.fn().mockResolvedValue({ value: customValue });
        mockFindOne.mockReturnValue({
            lean: mockLean
        });

        const result = await getAiLogCutoff();

        expect(mockFindOne).toHaveBeenCalledWith({ key: 'ai_log_cutoff' });
        expect(mockLean).toHaveBeenCalled();
        expect(result).toBe(customValue);
    });

    test('should return default value when setting exists but value is invalid', async () => {
        const mockLean = jest.fn().mockResolvedValue({ value: 'invalid' });
        mockFindOne.mockReturnValue({
            lean: mockLean
        });

        const result = await getAiLogCutoff();

        expect(result).toBe(AI_LOG_CUTOFF);
    });

    test('should return default value when setting exists but value is negative', async () => {
        const mockLean = jest.fn().mockResolvedValue({ value: -100 });
        mockFindOne.mockReturnValue({
            lean: mockLean
        });

        const result = await getAiLogCutoff();

        expect(result).toBe(AI_LOG_CUTOFF);
    });

    test('should return default value when setting does not exist', async () => {
        const mockLean = jest.fn().mockResolvedValue(null);
        mockFindOne.mockReturnValue({
            lean: mockLean
        });

        const result = await getAiLogCutoff();

        expect(result).toBe(AI_LOG_CUTOFF);
    });

    test('should return default value when database query fails', async () => {
        const mockLean = jest.fn().mockRejectedValue(new Error('DB error'));
        mockFindOne.mockReturnValue({
            lean: mockLean
        });

        const result = await getAiLogCutoff();

        expect(result).toBe(AI_LOG_CUTOFF);
    });

    test('should return default value when setting value is zero', async () => {
        const mockLean = jest.fn().mockResolvedValue({ value: 0 });
        mockFindOne.mockReturnValue({
            lean: mockLean
        });

        const result = await getAiLogCutoff();

        expect(result).toBe(AI_LOG_CUTOFF);
    });
});