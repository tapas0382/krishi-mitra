import { NextResponse } from "next/server";
import connectDB from "../../../../lib/db";
import Booking from "../../../../models/booking";
import Tool from "../../../../models/tool";
import RentalPayment from "../../../../models/rentalPayment";
import { getRazorpayInstance } from "../../../../lib/razorpay";

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    const { toolId, renterId, startDate, hoursRequested } = data;
    if (!toolId || !renterId || !startDate || !hoursRequested) {
      return NextResponse.json(
        { success: false, message: "Missing required fields for checkout" },
        { status: 400 }
      );
    }

    const tool = await Tool.findById(toolId).populate("owner", "_id name");
    if (!tool) {
      return NextResponse.json({ success: false, message: "Tool not found" }, { status: 404 });
    }

    if (String(tool.owner?._id) === String(renterId)) {
      return NextResponse.json(
        { success: false, message: "You cannot book your own tool" },
        { status: 400 }
      );
    }

    const totalPrice = Number(tool.pricePerHour) * Number(hoursRequested);
    const paymentAmountPaise = Math.round(totalPrice * 100);
    if (!Number.isFinite(paymentAmountPaise) || paymentAmountPaise <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid booking amount for payment" },
        { status: 400 }
      );
    }

    const booking = await Booking.create({
      tool: tool._id,
      renter: renterId,
      owner: tool.owner?._id,
      startDate: new Date(startDate),
      hoursRequested: Number(hoursRequested),
      totalPrice,
      paymentAmountPaise,
      paymentCurrency: "INR",
      paymentStatus: "hold_created",
      status: "pending"
    });

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: paymentAmountPaise,
      currency: "INR",
      receipt: `booking_${booking._id}`
    });

    const payment = await RentalPayment.create({
      booking: booking._id,
      payer: renterId,
      payee: tool.owner?._id,
      amount: paymentAmountPaise,
      currency: "INR",
      providerOrderId: order.id,
      status: "created",
      metadata: {
        toolId: tool._id.toString(),
        toolName: tool.name,
        hoursRequested: Number(hoursRequested)
      }
    });

    booking.payment = payment._id;
    await booking.save();

    return NextResponse.json(
      {
        success: true,
        bookingId: booking._id,
        amount: paymentAmountPaise,
        currency: "INR",
        razorpayOrderId: order.id,
        keyId: process.env.RAZORPAY_KEY_ID
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("BOOKING CHECKOUT ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
