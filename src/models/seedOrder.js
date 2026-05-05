import mongoose from "mongoose";

const SeedOrderSchema = new mongoose.Schema(
  {
    seed: { type: mongoose.Schema.Types.ObjectId, ref: 'Seed', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    quantityKg: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    
    status: { type: String, enum: ['pending', 'accepted', 'completed', 'rejected'], default: 'pending' }
  },
  { timestamps: true }
);

export default mongoose.models.SeedOrder || mongoose.model("SeedOrder", SeedOrderSchema);