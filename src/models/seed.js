import mongoose from "mongoose";

const SeedSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Basmati Rice", "Hybrid Tomato"
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    
    // Is the farmer offering this seed, or asking if anyone has it?
    type: { type: String, enum: ['offer', 'request'], required: true }, 
    
    quantity: { type: String, required: true }, // e.g., "5 kg", "200 grams"
    price: { type: Number, default: 0 }, // 0 means it's for free exchange/barter
    
    imageUrl: { type: String }, // Cloudinary image (optional for seeds)
    description: { type: String }, // e.g., "Grows well in low water, harvested last month."
    isAvailable: { type: Boolean, default: true },
    
    // We need location here too so farmers can find seeds locally!
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    villageName: { type: String, required: true },
  },
  { timestamps: true }
);

// 🚀 CRITICAL: The map index for the radius search
SeedSchema.index({ location: "2dsphere" });

export default mongoose.models.Seed || mongoose.model("Seed", SeedSchema);