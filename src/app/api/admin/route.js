import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import User from "../../../models/user";
import Tool from "../../../models/tool";
import Booking from "../../../models/booking";
import Seed from "../../../models/seed";
import SeedOrder from "../../../models/seedOrder";

export async function GET(request) {
  try {
    await connectDB();

    // 1. Get raw counts
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalTools = await Tool.countDocuments();
    const totalSeeds = await Seed.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // 2. Calculate Total Platform Economy (Revenue exchanged between farmers)
    const completedBookings = await Booking.find({ status: 'completed' });
    const toolEconomy = completedBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    const completedOrders = await SeedOrder.find({ status: 'completed' });
    const seedEconomy = completedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalEconomy = toolEconomy + seedEconomy;

    // 3. Get Recent Activity from BOTH Collections
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 }).limit(5)
      .populate('tool', 'name').populate('renter', 'name').populate('owner', 'name');

    const recentOrders = await SeedOrder.find()
      .sort({ createdAt: -1 }).limit(5)
      .populate('seed', 'name').populate('buyer', 'name').populate('seller', 'name');

    // Combine them, sort by newest date, and keep top 5
    const combinedActivity = [...recentBookings, ...recentOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Standardize labels so your frontend table displays perfectly
    const formattedActivity = combinedActivity.map(item => {
      if (item.buyer) { // If it has a buyer, it's a seed order
        return {
          _id: item._id,
          tool: { name: `🌱 ${item.seed?.name || 'Seed Order'}` }, 
          renter: item.buyer,   // Map buyer to 'renter'
          owner: item.seller,   // Map seller to 'owner'
          totalPrice: item.totalPrice,
          status: item.status
        };
      }
      return item; // Otherwise, it's a normal tool booking
    });

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalTools,
        totalSeeds,
        totalBookings,
        totalEconomy,
        recentActivity: formattedActivity
      }
    });
  } catch (error) {
    console.error("ADMIN API ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}