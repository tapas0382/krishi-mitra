import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/user";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    await connectDB();
    const { token, password } = await request.json();

    // 1. Hash the token from the URL to compare it with the DB version
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Find user with a matching token that hasn't expired yet
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Link is invalid or has expired (15 min limit)." },
        { status: 400 }
      );
    }

    // 3. Encrypt the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. Clean up: Delete tokens so the link can't be used twice
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return NextResponse.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("RESET ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}