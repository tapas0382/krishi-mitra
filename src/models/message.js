import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    // The user sending the message
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // The user receiving the message
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // The actual text message
    content: { type: String, required: true },
    
    // To show a "New!" badge if the message hasn't been read yet
    isRead: { type: Boolean, default: false },

    // Optional: Link the message to a specific tool or booking context
    tool: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool' },
  },
  { timestamps: true }
);

// Add an index to make fetching conversations between two specific users super fast
MessageSchema.index({ sender: 1, receiver: 1 });

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);