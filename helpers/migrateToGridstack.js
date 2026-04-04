/**
 * One-time migration script to convert existing chart order + chartSize
 * into Gridstack grid coordinates (gridX, gridY, gridW, gridH).
 *
 * Usage: node helpers/migrateToGridstack.js
 *
 * Connects to MongoDB using the same MONGO_URL from .env,
 * reads all ChartConfig documents sorted by order,
 * and computes grid positions using a column-packing algorithm.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import ChartConfig from '../models/Chart_Config.js';

const SIZE_TO_GRID = {
    tiny:    { w: 2, h: 1 },
    regular: { w: 4, h: 2 },
    large:   { w: 6, h: 2 },
    massive: { w: 12, h: 4 }
};

const COLUMNS = 12;

function computeGridPositions(charts) {
    // Height map: tracks the max occupied Y for each column
    const heightMap = new Array(COLUMNS).fill(0);

    return charts.map(chart => {
        const dims = SIZE_TO_GRID[chart.chartSize] || SIZE_TO_GRID.regular;
        const w = dims.w;
        const h = dims.h;

        // Find the first x position where all columns x..x+w-1 have the lowest Y
        let bestX = 0;
        let bestY = Infinity;

        for (let x = 0; x <= COLUMNS - w; x++) {
            // The Y for placing at this x is the max height across the columns it would span
            let maxY = 0;
            for (let col = x; col < x + w; col++) {
                maxY = Math.max(maxY, heightMap[col]);
            }
            if (maxY < bestY) {
                bestY = maxY;
                bestX = x;
            }
        }

        // Place the widget
        for (let col = bestX; col < bestX + w; col++) {
            heightMap[col] = bestY + h;
        }

        return {
            id: chart._id,
            gridX: bestX,
            gridY: bestY,
            gridW: w,
            gridH: h
        };
    });
}

async function migrate() {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        console.error('MONGO_URL not found in environment. Make sure .env is configured.');
        process.exit(1);
    }

    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB.');

    const charts = await ChartConfig.find().sort({ order: 1 }).lean();
    console.log(`Found ${charts.length} charts.`);

    if (charts.length === 0) {
        console.log('No charts to migrate.');
        await mongoose.disconnect();
        return;
    }

    const positions = computeGridPositions(charts);

    console.log('\nComputed positions:');
    positions.forEach((pos, i) => {
        const chart = charts[i];
        console.log(`  ${chart.title} (${chart.chartSize}) → x:${pos.gridX} y:${pos.gridY} w:${pos.gridW} h:${pos.gridH}`);
    });

    const operations = positions.map(pos => ({
        updateOne: {
            filter: { _id: pos.id },
            update: { $set: { gridX: pos.gridX, gridY: pos.gridY, gridW: pos.gridW, gridH: pos.gridH } }
        }
    }));

    const result = await ChartConfig.bulkWrite(operations);
    console.log(`\nMigration complete. Modified ${result.modifiedCount} documents.`);

    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
