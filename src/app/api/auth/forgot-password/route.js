import { NextResponse } from "next/server";
import connectDB from "@/lib/db"; // Double check this path matches your setup!
import User from "@/models/user";
import crypto from "crypto"; // Built into Node.js, no need to npm install

export async function POST(request) {
  try {
    await connectDB();
    const { email } = await request.json();

    // 1. Find the user
    const user = await User.findOne({ email });

    // Security Note: We return "success" even if the user isn't found.
    // This prevents hackers from using this form to guess which emails are registered.
    if (!user) {
      return NextResponse.json({ success: true, message: "Reset email sent" });
    }

    // 2. Generate a secure, random string (the token)
    const resetToken = crypto.randomBytes(20).toString("hex");

    // 3. Hash the token for database storage (so even if your DB is hacked, the tokens are safe)
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // Token expires in 15 minutes

    await user.save();

    // 4. Create the URL they will click
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    // 🚨 TEMPORARY SETUP FOR TESTING 🚨
    // Instead of setting up a real email server right now, we will print the link directly to your VS Code terminal!
    console.log("\n\n=============================================");
    console.log("🚨 PASSWORD RESET LINK REQUESTED 🚨");
    console.log(`Click here to reset: ${resetUrl}`);
    console.log("=============================================\n\n");

    return NextResponse.json({ success: true, message: "Reset email sent" });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}