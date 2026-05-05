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
    
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed'],
      default: 'pending'
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);