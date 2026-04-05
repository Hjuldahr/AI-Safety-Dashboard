import { KNOWN_MODELS, TOPIC_HIERARCHY, CHART_SIZES } from '../constants/charts.js';

describe('Charts Constants', () => {
    test('KNOWN_MODELS should contain expected models', () => {
        expect(KNOWN_MODELS).toEqual(['GoodModel', 'BadModel']);
        expect(KNOWN_MODELS).toHaveLength(2);
    });

    test('TOPIC_HIERARCHY should have expected structure', () => {
        expect(TOPIC_HIERARCHY).toHaveProperty('Customer Support');
        expect(TOPIC_HIERARCHY).toHaveProperty('Sales & Inquiry');
        expect(TOPIC_HIERARCHY).toHaveProperty('General Use');

        expect(TOPIC_HIERARCHY['Customer Support']).toContain('Troubleshooting');
        expect(TOPIC_HIERARCHY['Sales & Inquiry']).toContain('Product Info');
        expect(TOPIC_HIERARCHY['General Use']).toContain('Conversation');
    });

    test('CHART_SIZES should have expected sizes', () => {
        expect(CHART_SIZES).toHaveProperty('tiny', 'Tiny');
        expect(CHART_SIZES).toHaveProperty('regular', 'Regular');
        expect(CHART_SIZES).toHaveProperty('large', 'Large');
        expect(CHART_SIZES).toHaveProperty('massive', 'Massive');
    });

    test('all constants should be defined and not empty', () => {
        expect(KNOWN_MODELS).toBeDefined();
        expect(KNOWN_MODELS.length).toBeGreaterThan(0);

        expect(TOPIC_HIERARCHY).toBeDefined();
        expect(Object.keys(TOPIC_HIERARCHY).length).toBeGreaterThan(0);

        expect(CHART_SIZES).toBeDefined();
        expect(Object.keys(CHART_SIZES).length).toBeGreaterThan(0);
    });
});