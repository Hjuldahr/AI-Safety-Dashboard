import mongoose from 'mongoose';

const UserLogSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true,
        default: "0"
    }, 
    eventType: {
        type: Enum(),
        require: true,
        default: "Unspecifed Event"
    }
}, { timestamps: true });

