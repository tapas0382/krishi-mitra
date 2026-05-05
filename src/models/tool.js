import mongoose from "mongoose";

const ToolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Links tool to a specific user
    category: { type: String, required: true }, // e.g., Tractor, Sprayer, Harvester
    pricePerHour: { type: Number, required: true },
    imageUrl: { type: String, required: true }, // Will hold the Cloudinary link
    description: { type: String },
    isAvailable: { type: Boolean, default: true },
    
    // The exact GPS location of the tool
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    villageName: { type: String, required: true }, // For fallback manual searches
  },
  { timestamps: true }
);

// 🚀 CRITICAL: This index allows MongoDB to do the math for "Find tools within 20km"
ToolSchema.index({ location: "2dsphere" });

export default mongoose.models.Tool || mongoose.model("Tool", ToolSchema);