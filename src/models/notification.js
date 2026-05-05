import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    // The user receiving the alert
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // What the alert says (e.g., "Ramesh sent you a message!")
    text: { type: String, required: true },
    
    // Has the user seen it?
    isRead: { type: Boolean, default: false },
    
    // Where should clicking the notification take them?
    link: { type: String, required: true }, // e.g., '/messages' or '/dashboard'
    
    // Categorizing the alert
    type: { type: String, enum: ['booking', 'message', 'review', 'system'], default: 'system' }
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);