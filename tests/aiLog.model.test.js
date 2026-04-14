import mongoose from 'mongoose';
import AI_Log from '../models/AI_Log.js';
import { KNOWN_MODELS } from '../constants/charts.js';

describe('AI_Log model', () => {
    test('schema has required fields from DATA_DICTIONARY', () => {
        // Check that key fields are defined
        expect(AI_Log.schema.path('modelName')).toBeDefined();
        expect(AI_Log.schema.path('responseTimestamp')).toBeDefined();
        expect(AI_Log.schema.path('queryCount')).toBeDefined();
    });

    test('modelName enum matches KNOWN_MODELS', () => {
        const modelNamePath = AI_Log.schema.path('modelName');
        expect(modelNamePath.enumValues).toEqual(KNOWN_MODELS);
    });

    test('responseTimestamp has default function', () => {
        const timestampPath = AI_Log.schema.path('responseTimestamp');
        expect(typeof timestampPath.options.default).toBe('function');
    });

    test('queryCount has default value of 1', () => {
        const queryCountPath = AI_Log.schema.path('queryCount');
        expect(queryCountPath.options.default).toBe(1);
    });

    test('schema has tags field as ObjectId array', () => {
        const tagsPath = AI_Log.schema.path('tags');
        expect(tagsPath.options.type[0].ref).toBe('HistoricalTag');
    });

    test('schema has flaggedOutputs field as Object', () => {
        const flaggedOutputsPath = AI_Log.schema.path('flaggedOutputs');
        expect(flaggedOutputsPath.options.type).toBe(Object);
        expect(typeof flaggedOutputsPath.options.default).toBe('function');
        expect(flaggedOutputsPath.options.default()).toEqual({});      
        const breakdownPath = AI_Log.schema.path('breakdown');
        if (breakdownPath) {
            expect(breakdownPath.options.type).toBe(Object);
            expect(typeof breakdownPath.options.default).toBe('function');
            expect(breakdownPath.options.default()).toEqual({});       
        }
    });

    test('addLog static method exists', () => {
        expect(typeof AI_Log.addLog).toBe('function');
    });

    test('schema has index on modelName and responseTimestamp', () => {
        const indexes = AI_Log.schema.indexes();
        const expectedIndex = { modelName: 1, responseTimestamp: -1 };
        expect(indexes.some(([index]) => {
            return index.modelName === 1 && index.responseTimestamp === -1;
        })).toBe(true);
    });
});