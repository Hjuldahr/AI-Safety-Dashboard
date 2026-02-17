import mongoose from 'mongoose';

const { Schema } = mongoose;

const HistTagSchema = new Schema({
    originalTagId: {
        type: Schema.Types.ObjectId,
        ref: 'Tag',
        required: false // Set to false in case the original tag is deleted
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    color: {
        type: String,
        required: false,
        default: '#888888'
    }
}, { timestamps: true });

// ---------- INDEXES ----------
HistTagSchema.index({ name: 1, color: 1 });


// ---------- QUERIES ----------
HistTagSchema.statics.addOrFindTag = async function (tag) {
    return await this.findOneAndUpdate(
        { name: tag.name, color: tag.color },
        { $setOnInsert: { name: tag.name, color: tag.color, originalTagId: tag._id } },
        { upsert: true, new: true, runValidators: true }
    );
};

const HistTag = mongoose.model('HistoricalTag', HistTagSchema);
export default HistTag;
