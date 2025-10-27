// Depricating this model.
// Justification:
// We can store the model name as a string in the AI_Log model, the client isn't interested in per-user model management.
//      If this is something we want to add in the future, we can just filter logs by that string.

// import mongoose from 'mongoose';

// const AI_Model_Schema = new mongoose.Schema({
    // modelName: {
    //     type: String,
    //     required: true
    // },
//     userID: {
//         type: mongoose.Schema.Types.ObjectId,
//         required: true,
//         ref: 'User'
//     }
// });

// // ---------- QUERIES ----------

// // Add a new model for a user
// AI_Model_Schema.statics.addModel = async function(userID, modelName) {
//     const model = new this({ userID, modelName });
//     return model.save();
// };

// // Get a model by userID and modelName
// AI_Model_Schema.statics.getModelByUserAndName = function(userID, modelName) {
//     return this.findOne({ userID, modelName });
// };

// // Get all models by userID
// AI_Model_Schema.statics.getAllModelsByUser = function(userID) {
//     return this.find({ userID });
// };

// // Remove a model by model ID
// AI_Model_Schema.statics.removeModelById = function(modelID) {
//     return this.findByIdAndDelete(modelID);
// };

// // ---------- EXPORT ----------
// const AI_Model = mongoose.model('AI_Model', AI_Model_Schema);

// export default AI_Model;