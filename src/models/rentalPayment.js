import mongoose from "mongoose";

const RentalPaymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay"
    },
    paymentType: {
      type: String,
      enum: ["rental_escrow", "seed_order_escrow"],
      default: "rental_escrow"
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    providerOrderId: { type: String, required: true, unique: true, index: true },
    providerPaymentId: { type: String, index: true, sparse: true },
    providerRefundId: { type: String, index: true, sparse: true },
    status: {
      type: String,
      enum: [
        "created",
        "authorized",
        "capture_pending",
        "captured",
        "refund_pending",
        "refunded",
        "failed"
      ],
      default: "created",
      index: true
    },
    refundReason: { type: String, trim: true },
    refundAmount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export default mongoose.models.RentalPayment || mongoose.model("RentalPayment", RentalPaymentSchema);
