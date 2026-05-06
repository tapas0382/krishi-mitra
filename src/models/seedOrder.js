import mongoose from "mongoose";

const SeedOrderSchema = new mongoose.Schema(
  {
    seed: { type: mongoose.Schema.Types.ObjectId, ref: 'Seed', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    quantityKg: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    paymentAmountPaise: { type: Number, default: 0 },
    paymentCurrency: { type: String, default: "INR" },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "RentalPayment" },
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "hold_created",
        "held",
        "capture_pending",
        "captured",
        "refund_pending",
        "refunded",
        "failed"
      ],
      default: "unpaid"
    },
    sellerDecisionAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    completedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    
    status: { type: String, enum: ['pending', 'accepted', 'completed', 'rejected'], default: 'pending' }
  },
  { timestamps: true }
);

export default mongoose.models.SeedOrder || mongoose.model("SeedOrder", SeedOrderSchema);