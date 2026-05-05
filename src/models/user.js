import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true
    },
    password: { type: String, required: true }, // We will encrypt this later
    role: { 
      type: String, 
      enum: ['farmer', 'buyer', 'admin'], 
      default: 'farmer' 
    },
    villageName: { type: String, required: true },
    // Optional: We can store the user's default GPS location here later
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);