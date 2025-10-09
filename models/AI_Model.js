import mongoose from 'mongoose';

const AI_ModelSchema = new mongoose.Schema({
    modelName: {
        type: String,
        required: true
    },
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
});

// ---------- QUERIES ----------

// Add a new model for a user
AI_ModelSchema.statics.addModel = async function(userID, modelName) {
    const model = new this({ userID, modelName });
    return model.save();
};

// Get a model by userID and modelName
AI_ModelSchema.statics.getModelByUserAndName = function(userID, modelName) {
    return this.findOne({ userID, modelName });
};

// Get all models by userID
AI_ModelSchema.statics.getAllModelsByUser = function(userID) {
    return this.find({ userID });
};

// Remove a model by model ID
AI_ModelSchema.statics.removeModelById = function(modelID) {
    return this.findByIdAndDelete(modelID);
};

// ---------- EXPORT ----------
const AI_Model = mongoose.model('AI_Model', AI_ModelSchema);

export default AI_Model;