import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import Notification from "../../../models/notification";

// GET: Fetch a user's latest notifications
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 });
    }

    // Get the 15 most recent notifications
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(15);

    // Count how many are unread for the red badge
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error("NOTIFICATION GET ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Mark notifications as read
export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.userId) {
      return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 });
    }

    // Mark all unread notifications for this user as read
    await Notification.updateMany(
      { recipient: data.userId, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ success: true, message: "Notifications marked as read" });
  } catch (error) {
    console.error("NOTIFICATION PUT ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Create a new notification (We will trigger this from bookings/messages later)
export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    const newNotification = await Notification.create(data);
    return NextResponse.json({ success: true, data: newNotification }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}