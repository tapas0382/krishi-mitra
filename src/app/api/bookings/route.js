import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import Booking from "../../../models/booking";
import Tool from "../../../models/tool";
import Seed from "../../../models/seed";
import User from "../../../models/user";
import Notification from "../../../models/notification";

// POST: Create a new booking request
export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    // 1. Fetch the tool to get the price and the owner's ID

    // --- 1. SMART DETECTION: Is this a Tool or a Seed? ---
    if (data.toolId) {
      const tool = await Tool.findById(data.toolId);
      if (!tool) return NextResponse.json({ success: false, message: "Tool not found" }, { status: 404 });
      
      totalPrice = tool.pricePerHour * (data.hoursRequested || 1);
    } 
    else if (data.seedId) {
      const seed = await Seed.findById(data.seedId);
      if (!seed) return NextResponse.json({ success: false, message: "Seed listing not found" }, { status: 404 });
      
      // Seeds usually use 'price' per kg and 'quantity'
      totalPrice = (seed.price || 0) * (data.quantity || 1);
    } 
    else {
      return NextResponse.json({ success: false, message: "No item specified" }, { status: 400 });
    }

    // 2. Create the booking record
    const newBooking = await Booking.create({
      tool: data.toolId,
      seed: data.seedId,
      renter: data.renterId,
      owner: tool.owner, // We get this directly from the tool
      startDate: new Date(data.startDate),
      hoursRequested: data.hoursRequested,
      quantity: data.quantity,
      totalPrice: totalPrice,
      status: 'pending'
    });

    await Notification.create({
      recipient: tool.owner, // The person who owns the tractor
      text: `New booking request! Someone wants to rent your ${tool.name}.`,
      link: '/dashboard',
      type: 'booking'
    });

    return NextResponse.json(
      { success: true, message: "Booking request sent successfully!", booking: newBooking },
      { status: 201 }
    );
  } catch (error) {
    console.log("BOOKING POST ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET: Fetch bookings for a specific user (either as the owner or the renter)
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role'); // 'owner' or 'renter'

    if (!userId) {
      return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 });
    }

    // Create a query based on whether they are renting tools OUT (owner) or renting tools IN (renter)
    let query = {};
    if (role === 'owner') query.owner = userId;
    if (role === 'renter') query.renter = userId;

    // Fetch the bookings and bring in the tool name and renter/owner details
    const bookings = await Booking.find(query)
      .populate('tool', 'name imageUrl pricePerHour')
      .populate('seed', 'name imageUrl price')
      .populate('renter', 'name phone villageName')
      .populate('owner', 'name phone villageName')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: bookings }, { status: 200 });
  } catch (error) {
    console.log("BOOKING GET ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Update booking status (Accept/Reject)
export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.bookingId || !data.status) {
      return NextResponse.json({ success: false, message: "Missing required data" }, { status: 400 });
    }

    // Find the booking and update its status
    const updatedBooking = await Booking.findByIdAndUpdate(
      data.bookingId,
      { status: data.status },
      { new: true } // Returns the updated document
    ).populate('tool').populate('seed');

    if (!updatedBooking) {
        return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    await Notification.create({
      // 1. Matches your 'recipient' field
      recipient: updatedBooking.renter, 
      
      // 2. Matches your 'text' field
      text: `Your rental request for ${updatedBooking.tool?.name || 'a tool'} has been ${data.status}!`,
      
      // 3. Matches your 'type' enum exactly
      type: 'booking', 
      
      // 4. Required by your schema! Where should they go when they click it?
      link: '/dashboard/history', 
      
      // 5. Matches your 'isRead' field
      isRead: false
    });

    return NextResponse.json({ success: true, message: `Booking ${data.status}!`, booking: updatedBooking }, { status: 200 });
  } catch (error) {
    console.log("BOOKING PUT ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}