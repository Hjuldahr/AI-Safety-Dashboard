import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "../constants/notification.js";

const NotificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  category: { 
    type: String, 
    enum: Object.values(NOTIFICATION_TYPES),
    default: 'generic'
  },
  redirectUrl: { type: String, default: null },
  colour: { type: String, default: "info" },
  timeout: { type: Number, default: 3 }, // seconds
  dismissible: { type: Boolean, default: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }]
}, { timestamps: true });

NotificationSchema.methods.autoCalculateTimeout = function () {
  const wordCount = this.message.trim().split(/\s+/).length;
  let calculatedTimeout = (wordCount * 0.25) + 2;
  this.timeout = Math.min(Math.max(calculatedTimeout, 3), 8);
};

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ category: 1, createdAt: -1 });
NotificationSchema.index({ tags: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;