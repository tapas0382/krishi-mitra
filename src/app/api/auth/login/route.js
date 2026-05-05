import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/user";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    await connectDB();
    const { phone, password } = await request.json();

    // 1. Find the user by phone number
    const user = await User.findOne({ phone });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No account found with this phone number" },
        { status: 404 }
      );
    }

    // 2. Check if the password is correct
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      );
    }

    // 3. Remove the password before sending user data back to the frontend
    const userData = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      villageName: user.villageName,
    };

    return NextResponse.json(
      { success: true, message: "Login successful!", user: userData },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}