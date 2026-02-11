import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['generic', 'alert', 'demo', 'server'],
    default: 'generic'
  },
  redirectUrl: { type: String, default: null },
  background: { type: String, default: '#ffffff' },
  timeout: { type: Number, default: 10 }, // seconds
  dismissible: { type: Boolean, default: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }]
}, { timestamps: true });

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ category: 1, createdAt: -1 });
NotificationSchema.index({ tags: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;