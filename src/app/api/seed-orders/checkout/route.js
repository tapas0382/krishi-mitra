import { NextResponse } from "next/server";
import connectDB from "../../../../lib/db";
import Seed from "../../../../models/seed";
import SeedOrder from "../../../../models/seedOrder";
import RentalPayment from "../../../../models/rentalPayment";
import { getRazorpayInstance } from "../../../../lib/razorpay";

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    const { seedId, buyerId, quantityKg } = data;

    if (!seedId || !buyerId || !quantityKg) {
      return NextResponse.json({ success: false, message: "Missing required fields for seed checkout" }, { status: 400 });
    }

    const seed = await Seed.findById(seedId).populate("owner", "_id");
    if (!seed) {
      return NextResponse.json({ success: false, message: "Seed listing not found" }, { status: 404 });
    }

    if (String(seed.owner?._id) === String(buyerId)) {
      return NextResponse.json({ success: false, message: "You cannot buy your own seeds" }, { status: 400 });
    }

    const quantity = Number(quantityKg);
    const totalPrice = Number(seed.price || 0) * quantity;
    const paymentAmountPaise = Math.round(totalPrice * 100);

    if (!Number.isFinite(paymentAmountPaise) || paymentAmountPaise <= 0) {
      return NextResponse.json({ success: false, message: "Invalid seed order amount for payment" }, { status: 400 });
    }

    const seedOrder = await SeedOrder.create({
      seed: seed._id,
      buyer: buyerId,
      seller: seed.owner?._id,
      quantityKg: quantity,
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
      receipt: `seed_order_${seedOrder._id}`
    });

    const payment = await RentalPayment.create({
      booking: seedOrder._id,
      payer: buyerId,
      payee: seed.owner?._id,
      amount: paymentAmountPaise,
      currency: "INR",
      paymentType: "seed_order_escrow",
      providerOrderId: order.id,
      status: "created",
      metadata: {
        seedOrderId: seedOrder._id.toString(),
        seedId: seed._id.toString(),
        seedName: seed.name,
        quantityKg: quantity
      }
    });

    seedOrder.payment = payment._id;
    await seedOrder.save();

    return NextResponse.json({
      success: true,
      seedOrderId: seedOrder._id,
      amount: paymentAmountPaise,
      currency: "INR",
      razorpayOrderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID
    }, { status: 201 });
  } catch (error) {
    console.log("SEED ORDER CHECKOUT ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
