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
    }
}, { 
    timestamps: true 
});

const ChartConfig = mongoose.model('ChartConfig', chartConfigSchema);

export default ChartConfig;