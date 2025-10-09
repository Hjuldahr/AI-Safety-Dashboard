import mongoose from 'mongoose';

const UserLogSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }, 
    eventType: {
        type: Enum(),
        require: true,
        default: "Unspecifed Event"
    }
}, { timestamps: true });

//TODO update