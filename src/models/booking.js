import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    tool: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool' },
    seed: { type: mongoose.Schema.Types.ObjectId, 
    ref: 'Seed' },
    renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Who is renting it
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Who owns it
    
    startDate: { type: Date, required: true },
    hoursRequested: { type: Number, required: true },
    quantity: {
      type: Number,
      default: 0
    },
    totalPrice: { type: Number, required: true },
    paymentAmountPaise: { type: Number, default: 0 },
    paymentCurrency: { type: String, default: 'INR' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalPayment' },
    paymentStatus: {
      type: String,
      enum: [
        'unpaid',
        'hold_created',
        'held',
        'capture_pending',
        'captured',
        'refund_pending',
        'refunded',
        'failed'
      ],
      default: 'unpaid'
    },
    ownerDecisionAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    completedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed'],
      default: 'pending'
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);