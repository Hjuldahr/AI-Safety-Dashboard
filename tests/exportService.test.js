import { jest } from '@jest/globals';
import { handleEmptyExport } from '../services/exportService.js';

describe('exportService', () => {
    test('handleEmptyExport should send 404 response with message', () => {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        const type = 'reports';
        handleEmptyExport(res, type);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: 'No reports found for the selected criteria. The date range may be empty.'
        });
    });
});