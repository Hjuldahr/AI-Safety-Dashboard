import mongoose from 'mongoose';
const { Schema } = mongoose;

const chartConfigSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    chartType: {
        type: String,
        required: true,
        enum: ['line', 'bar', 'pie', 'measure']
    },
    chartSize: {
        type: String,
        required: true,
        enum: ['tiny', 'regular', 'large', 'massive'],
        default: 'regular'
    },
    chartTimeRange: {
        type: String,
        required: true,
        enum: ['10s', '30s', '1m', '5m', '15m', '1h', '1d', '1w', '1mo'],
        default: '10s'
    },
    order: {
        type: Number,
        required: true,
        default: 9999
    },
    yAxis: {
        type: String,
        default: null
    },
    xAxis: {
        type: String,
        default: null
    },
    category: {
        type: String,
        default: null
    },
    splitBy: {
        type: String,
        default: null
    },
    includedValues: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

const ChartConfig = mongoose.model('ChartConfig', chartConfigSchema);

export default ChartConfig;