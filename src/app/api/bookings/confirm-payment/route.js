import { NextResponse } from "next/server";
import connectDB from "../../../../lib/db";
import Booking from "../../../../models/booking";
import RentalPayment from "../../../../models/rentalPayment";
import Notification from "../../../../models/notification";
import { verifyRazorpaySignature } from "../../../../lib/razorpay";

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    const {
      bookingId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = data;

    if (!bookingId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ success: false, message: "Missing payment confirmation fields" }, { status: 400 });
    }

    const signatureValid = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!signatureValid) {
      return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 });
    }

    const booking = await Booking.findById(bookingId).populate("tool", "name");
    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const payment = await RentalPayment.findOne({ booking: booking._id, providerOrderId: orderId });
    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment record not found" }, { status: 404 });
    }

    payment.providerPaymentId = paymentId;
    payment.status = "authorized";
    await payment.save();

    booking.paymentStatus = "held";
    booking.payment = payment._id;
    await booking.save();

    await Notification.create({
      recipient: booking.owner,
      text: `New paid booking request for ${booking.tool?.name || "your tool"}. Accept to confirm rental.`,
      link: "/dashboard",
      type: "booking"
    });

    return NextResponse.json({ success: true, message: "Payment held successfully. Awaiting owner decision." }, { status: 200 });
  } catch (error) {
    console.log("BOOKING CONFIRM PAYMENT ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
