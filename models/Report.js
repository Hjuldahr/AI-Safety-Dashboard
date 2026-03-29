import mongoose from "mongoose";

// ---------- Report Schema ----------
const ReportSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    
}, { timestamps: true });


// ---------- EXPORT ----------
const Report = mongoose.model('Report', ReportSchema);
export default Report;