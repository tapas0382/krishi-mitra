import { NextResponse } from "next/server";
import connectDB from "../../../../lib/db";
import SeedOrder from "../../../../models/seedOrder";
import RentalPayment from "../../../../models/rentalPayment";
import Notification from "../../../../models/notification";
import { verifyRazorpaySignature } from "../../../../lib/razorpay";

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    const {
      seedOrderId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = data;

    if (!seedOrderId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ success: false, message: "Missing payment confirmation fields" }, { status: 400 });
    }

    const signatureValid = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!signatureValid) {
      return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 });
    }

    const seedOrder = await SeedOrder.findById(seedOrderId).populate("seed", "name");
    if (!seedOrder) {
      return NextResponse.json({ success: false, message: "Seed order not found" }, { status: 404 });
    }

    const payment = await RentalPayment.findOne({ booking: seedOrder._id, providerOrderId: orderId });
    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment record not found" }, { status: 404 });
    }

    payment.providerPaymentId = paymentId;
    payment.status = "authorized";
    await payment.save();

    seedOrder.paymentStatus = "held";
    seedOrder.payment = payment._id;
    await seedOrder.save();

    await Notification.create({
      recipient: seedOrder.seller,
      text: `New paid seed order for ${seedOrder.seed?.name || "your listing"}. Accept to confirm order.`,
      link: "/dashboard",
      type: "system"
    });

    return NextResponse.json({ success: true, message: "Payment held successfully. Awaiting seller decision." }, { status: 200 });
  } catch (error) {
    console.log("SEED ORDER CONFIRM PAYMENT ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
