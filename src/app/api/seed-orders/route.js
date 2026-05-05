import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import SeedOrder from "../../../models/seedOrder";
import Notification from "../../../models/notification";
import Seed from "../../../models/seed";

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    // 1. Create the formal order in the database
    const newOrder = await SeedOrder.create({
      seed: data.seedId,
      buyer: data.buyerId,
      seller: data.sellerId,
      quantityKg: data.quantityKg,
      totalPrice: data.totalPrice,
    });

    // 2. Ring the Notification Bell for the Seller! 🔔
    await Notification.create({
      recipient: data.sellerId,
      text: `New Order! Someone wants to buy ${data.quantityKg}kg of your seeds.`,
      link: '/dashboard', // They can manage orders in their dashboard
      type: 'system'
    });

    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error) {
    console.error("SEED ORDER ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET: Fetch incoming orders OR outgoing purchases for the Dashboard
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const buyerId = searchParams.get('buyerId');

    // 1. Determine what we are looking for based on who is asking
    let query = {};
    if (sellerId) {
      query = { $or: [{ seller: sellerId }, { sellerId: sellerId }] };
    } else if (buyerId) {
      query = { buyer: buyerId };
    } else {
      return NextResponse.json({ success: false, message: "Missing buyerId or sellerId" }, { status: 400 });
    }

    // 2. Fetch the orders and populate BOTH the buyer and the seller
    const orders = await SeedOrder.find(query)
      .populate('seed')
      .populate('buyer', 'name phone')
      .populate('seller', 'name phone') // Added this so we know who is selling!
      .sort({ createdAt: -1 });

    // 3. Format the data: The frontend UI expects the person who posted the item 
    // to be called "owner", so we map the "seller" to "owner" for a seamless fit.
    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      orderObj.owner = orderObj.seller; 
      return orderObj;
    });

    return NextResponse.json({ success: true, data: formattedOrders });
  } catch (error) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Approve or Reject the order
export async function PUT(request) {
  try {
    await connectDB();
    const { orderId, status } = await request.json(); // status will be 'accepted' or 'rejected'

    const updatedOrder = await SeedOrder.findByIdAndUpdate(
      orderId,
      { status: status },
      { new: true }
    ).populate('seed');

    // Ring the notification bell for the BUYER so they know the result!
    await Notification.create({
      recipient: updatedOrder.buyer,
      text: `Your order for ${updatedOrder.seed.name} was ${status}!`,
      link: status === 'completed' ? '/dashboard/history' : '/dashboard',
      type: 'system'
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}