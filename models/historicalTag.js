import mongoose from 'mongoose';
import Tag from "./tag.js";

const { Schema } = mongoose;

const HistTagSchema = new Schema({
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


// ---------- QUERIES ----------
HistTagSchema.statics.addOrFindTag = async function (tag) {
    if (!tag.name || !tag.color) {
        throw new Error("Tag name or color not found!");
    }

    const existingTag = await this.findOne({ name: tag.name, color: tag.color });
    if (existingTag) {
        return existingTag;
    } else {
        return await this.create({ name: tag.name, color: tag.color });
    }
}

const HistTag = mongoose.model('HistoricalTag', HistTagSchema);
export default HistTag;
