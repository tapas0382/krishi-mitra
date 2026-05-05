import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/user";
import bcrypt from "bcryptjs";
import Notification from '@/models/notification';

export async function POST(request) {
  try {
    await connectDB();
    const { name, phone, email, password, role, villageName } = await request.json();

    // Basic backend safety check
    if (!name || !phone || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Check if user already exists
    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Phone number or email already registered" },
        { status: 400 }
      );
    }

    // 2. Encrypt the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Save the new user to MongoDB
    const newUser = await User.create({
      name,
      phone,
      email,
      password: hashedPassword,
      role: role || 'farmer',
      villageName,
    });

    // ====================================================================
    // 👇 4. ADMIN NOTIFICATION TRIGGER 👇
    // ====================================================================
    try {
      // Look for the admin account in the database
      const adminUser = await User.findOne({ role: 'admin' });
      
      if (adminUser) {
        // Create the notification for the admin
        await Notification.create({
          recipient: adminUser._id,
          type: 'system',
          text: `New ${role || 'farmer'} joined: ${name} from ${villageName || 'unknown location'}`,
          link: '/admin', 
          isRead: false
        });
      }
    } catch (notifError) {
      console.error("Could not send admin notification:", notifError);
      // We catch this error silently so it doesn't stop the user from registering
    }
    // ====================================================================

    return NextResponse.json(
      { success: true, message: "Account created successfully!" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}