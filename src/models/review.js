import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    // The farmer who rented the tool or bought the seed
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    
    // The farmer who owns the item being reviewed
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // The specific tool (REQUIRED: FALSE because it might be a seed!)
    tool: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool', required: false },

    // The specific seed (REQUIRED: FALSE because it might be a tool!)
    seed: { type: mongoose.Schema.Types.ObjectId, ref: 'Seed', required: false },
    
    // The transaction ID this review is linked to (prevents spam/fake reviews)
    // Removed the strict 'ref' so it can accept both Tool Bookings and Seed Orders safely
    booking: { type: mongoose.Schema.Types.ObjectId, required: true },

    // The actual star rating (1 to 5)
    rating: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    
    // The written feedback
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent a user from leaving multiple reviews for the exact same transaction
ReviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);