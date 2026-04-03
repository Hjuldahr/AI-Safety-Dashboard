import path from 'path';
import { fileURLToPath } from 'url';
import * as h5wasm from 'h5wasm/node';
import fs from 'fs';
import { DATA_DICTIONARY } from '../constants/charts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Shared Helpers ===

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const handleEmptyExport = (res, type) => {
    return res.status(404).json({
        message: `No ${type} found for the selected criteria. The date range may be empty.`
    });
};

// === CSV Generation ===

/**
 * Generates CSV for AI Logs / AI Summaries using DATA_DICTIONARY fields.
 */
export const generateDynamicCsv = (data, title = "Export") => {
    if (!data || data.length === 0) return "";

    const dictFields = Object.keys(DATA_DICTIONARY).filter(key =>
        ['numeric', 'categorical', 'timestamp'].includes(DATA_DICTIONARY[key].dataType)
    );

    const headers = ['id', 'displayDate', ...dictFields];
    const rows = [headers.join(',')];

    data.forEach(item => {
        const values = headers.map(header => {
            let val = '';
            if (header === 'id') val = item._id?.toString();
            else if (header === 'displayDate') val = new Date(item.responseTimestamp).toISOString();
            else val = item[header] ?? '';

            return `"${('' + val).replace(/"/g, '""')}"`;
        });
        rows.push(values.join(','));
    });

    return rows.join('\n');
};

/**
 * Generates CSV for User Logs (different schema from AI logs).
 */
export const generateUserLogCsv = (logs) => {
    if (!logs || logs.length === 0) return "";

    const headers = ['id', 'timestamp', 'user', 'eventType', 'details'];
    const rows = [headers.join(',')];

    logs.forEach(log => {
        const values = [
            log._id?.toString(),
            new Date(log.createdAt).toISOString(),
            log.userID?.email || log.userID?.toString() || '',
            log.eventType || '',
            log.details || ''
        ].map(val => `"${('' + val).replace(/"/g, '""')}"`);

        rows.push(values.join(','));
    });

    return rows.join('\n');
};

/**
 * Sends CSV content as a file download response.
 */
export const sendCsvResponse = (res, csvContent, filename) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
};

// === HDF5 Generation ===

/**
 * Writes AI Log / Summary data into an HDF5 group using DATA_DICTIONARY.
 */
export const writeStructuredData = (group, data) => {
    if (!data.length) return;

    Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
        const { dbPath, dataType } = config;

        const columnData = data.map(item => {
            const val = getNestedValue(item, dbPath);

            if (dataType === 'numeric') return val ?? 0;
            if (dataType === 'timestamp') return new Date(val).getTime();
            return val ? String(val) : "";
        });

        group.create_dataset({
            name: key,
            data: columnData,
            dtype: dataType === 'numeric' || dataType === 'timestamp' ? 'f8' : undefined
        });
    });
};

/**
 * Writes User Log data into an HDF5 group.
 */
export const writeUserLogData = (group, logs) => {
    if (!logs.length) return;

    const columns = {
        id: logs.map(l => l._id?.toString() || ''),
        timestamp: logs.map(l => new Date(l.createdAt).getTime()),
        user: logs.map(l => l.userID?.email || l.userID?.toString() || ''),
        eventType: logs.map(l => l.eventType || ''),
        details: logs.map(l => l.details || '')
    };

    group.create_dataset({ name: 'id', data: columns.id });
    group.create_dataset({ name: 'timestamp', data: columns.timestamp, dtype: 'f8' });
    group.create_dataset({ name: 'user', data: columns.user });
    group.create_dataset({ name: 'eventType', data: columns.eventType });
    group.create_dataset({ name: 'details', data: columns.details });
};

/**
 * Creates a temp HDF5 file, writes data into a named group, and sends it as a download.
 */
export const createAndSendHdf5 = async (res, groupName, data, writerFn, filename) => {
    const filePath = path.join(__dirname, `../temp/export-${Date.now()}.h5`);

    try {
        await h5wasm.ready;

        const file = new h5wasm.File(filePath, 'w');
        const group = file.create_group(groupName);

        writerFn(group, data);

        file.close();

        res.download(filePath, filename, () => {
            fs.unlinkSync(filePath);
        });
    } catch (err) {
        console.error("HDF5 Export Error:", err);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ message: 'HDF5 Generation failed', error: err.message });
    }
};
