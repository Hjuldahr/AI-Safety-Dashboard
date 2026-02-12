import mongoose from 'mongoose';

const { Schema } = mongoose;

const HistTagSchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    color: { type: String, required: false, default: '#888888' }
}, { timestamps: true });

const HistTag = mongoose.model('HistoricalTag', HistTagSchema);
export default HistTag;
