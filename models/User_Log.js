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
            'User_Created',
            'User_Deleted',
            'User_Updated',
            'Role_Created',
            'Role_Deleted',
            'Role_Changed',
            'Setting_Changed',
            'Alert_Created',
            'Alert_Modified',
            'Alert_Deleted',
            'Report_Created',
            'Report_Deleted',
            'Chart_Created',
            'Chart_Modified',
            'Chart_Deleted',
            'Unspecified_Event',
            'OTP_Generated',
            'Password_Reset'
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
 *
 * Example usages:
 * await User_Log.addLog(newUser._id, 'Signup', `Successful signup from IP: ${req.ip}`);
 * User_Log.addLog(req.user._id, 'Logout', 'User logged out.').catch(err => console.error('Failed to write log:', err));
 * 
 * First usage waits for the log to complete before continuing (not always needed), second one writes the log in
 *  the background and suppresses any errors caused by this.
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
