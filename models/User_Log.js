import mongoose from 'mongoose';

// ---------- SCHEMA ----------

const User_Log_Schema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }, 
    eventType: {
        type: String,
        enum: [
            'Login',
            'Logout',
            'Signup',
            'Alert_Created',
            'Alert_Modified',
            'Alert_Deleted',
            'Report_Created',
            'Report_Deleted',
            'Unspecified_Event'
        ],
        required: true,
        default: 'Unspecified_Event'
    },
    details: {
        type: String,
        required: true,
    }
}, { timestamps: true });


// ---------- STATIC METHODS ----------

/**
 * Add a single log entry.
 */
User_Log_Schema.statics.addLog = async function (userID, eventType, details) {
    return this.create({ userID, eventType, details });
};

/**
 * Add multiple log entries at once.
 */
User_Log_Schema.statics.addLogs = async function (logs) {
    // logs = [{ userID, eventType, details }, ...]
    return this.insertMany(logs);
};

/**
 * Get logs by user and time range.
 * Pass null for start or end to make it open-ended.
 */
User_Log_Schema.statics.getLogsByUserAndTime = async function (userID, start = null, end = null) {
    const query = { userID };

    if (start || end) {
        query.createdAt = {};
        if (start) query.createdAt.$gte = start;
        if (end) query.createdAt.$lte = end;
    }

    return this.find(query).sort({ createdAt: -1 });
};

/**
 * Remove a single log by its ID.
 */
User_Log_Schema.statics.removeLogById = async function (logId) {
    return this.findByIdAndDelete(logId);
};

/**
 * Remove all logs for a given user.
 */
User_Log_Schema.statics.removeAllLogsForUser = async function (userID) {
    return this.deleteMany({ userID });
};


// ---------- EXPORT ----------

const User_Log = mongoose.model('User_Log', User_Log_Schema);

export default User_Log;
