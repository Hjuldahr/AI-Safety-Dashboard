import mongoose from 'mongoose';
import Report from '../models/Report.js';

describe('Report model', () => {
    test('title field is required', () => {
        const titlePath = Report.schema.path('title');
        expect(titlePath.options.required).toBe(true);
        expect(titlePath.options.type).toBe(String);
    });

    test('schema has timestamps enabled', () => {
        expect(Report.schema.options.timestamps).toBe(true);
    });

    test('can create a valid report instance', () => {
        const report = new Report({
            title: 'Test Report'
        });

        expect(report.title).toBe('Test Report');
    });

    test('validation fails when title is missing', async () => {
        const report = new Report({});

        await expect(report.validate()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('validation passes with valid title', async () => {
        const report = new Report({
            title: 'Valid Report Title'
        });

        await expect(report.validate()).resolves.toBeUndefined();
    });
});