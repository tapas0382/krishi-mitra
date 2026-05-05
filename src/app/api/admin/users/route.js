import { NextResponse } from 'next/server';
import connectDB from '@/lib/db'; // Adjust this path if your db connection file is elsewhere
import User from '@/models/user'; // Adjust path to your User model

// GET: Fetch all users
export async function GET(req) {
  try {
    await connectDB();

    // 🛡️ THE FIX: Fetch users where the role is NOT equal to 'admin'
    const users = await User.find({ role: { $ne: 'admin' } })
                            .sort({ createdAt: -1 }); // Sorts by newest first

    return NextResponse.json({ 
      success: true, 
      count: users.length,
      data: users 
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Error fetching users" }, 
      { status: 500 }
    );
  }
}

// DELETE: Remove a user by ID
export async function DELETE(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Note: In a production app, you might also want to delete all tools/seeds associated with this userId!
    
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}