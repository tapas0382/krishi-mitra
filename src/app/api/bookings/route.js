import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import Booking from "../../../models/booking";
import Tool from "../../../models/tool";
import Seed from "../../../models/seed";
import User from "../../../models/user";
import Notification from "../../../models/notification";
import RentalPayment from "../../../models/rentalPayment";
import { getRazorpayInstance } from "../../../lib/razorpay";

// POST: Create a new booking request
export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    let totalPrice = 0;
    let ownerId = null;
    let itemName = "listing";
    let bookingType = "tool";

    if (data.toolId) {
      const tool = await Tool.findById(data.toolId);
      if (!tool) return NextResponse.json({ success: false, message: "Tool not found" }, { status: 404 });
      
      totalPrice = tool.pricePerHour * (data.hoursRequested || 1);
      ownerId = tool.owner;
      itemName = tool.name;
      bookingType = "tool";
    } 
    else if (data.seedId) {
      const seed = await Seed.findById(data.seedId);
      if (!seed) return NextResponse.json({ success: false, message: "Seed listing not found" }, { status: 404 });
      
      totalPrice = (seed.price || 0) * (data.quantity || 1);
      ownerId = seed.owner;
      itemName = seed.name;
      bookingType = "seed";
    } 
    else {
      return NextResponse.json({ success: false, message: "No item specified" }, { status: 400 });
    }

    const newBooking = await Booking.create({
      tool: data.toolId,
      seed: data.seedId,
      renter: data.renterId,
      owner: ownerId,
      startDate: new Date(data.startDate),
      hoursRequested: data.hoursRequested,
      quantity: data.quantity,
      totalPrice: totalPrice,
      paymentAmountPaise: bookingType === "tool" ? Math.round(totalPrice * 100) : 0,
      paymentStatus: bookingType === "tool" ? "unpaid" : "unpaid",
      status: 'pending'
    });

    await Notification.create({
      recipient: ownerId,
      text: `New booking request! Someone wants to rent your ${itemName}.`,
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

    const filteredBookings = role === "owner"
      ? bookings.filter((booking) => {
          // Seed orders are unaffected by Razorpay flow.
          if (!booking.tool) return true;

          // Tool bookings become actionable only after payment is held/captured.
          if (booking.status === "pending") {
            return ["held", "captured", "refund_pending", "refunded"].includes(booking.paymentStatus);
          }
          return true;
        })
      : bookings;

    return NextResponse.json({ success: true, data: filteredBookings }, { status: 200 });
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

    const booking = await Booking.findById(data.bookingId)
      .populate('tool')
      .populate('seed');

    if (!booking) {
        return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
    }

    const isToolBooking = Boolean(booking.tool);
    if (isToolBooking) {
      if (data.status === "accepted") {
        if (booking.paymentStatus !== "held") {
          return NextResponse.json(
            { success: false, message: "Cannot accept booking before payment is held." },
            { status: 400 }
          );
        }

        const payment = await RentalPayment.findById(booking.payment);
        if (!payment?.providerPaymentId) {
          return NextResponse.json(
            { success: false, message: "Payment record not ready for capture." },
            { status: 400 }
          );
        }

        const razorpay = getRazorpayInstance();
        const providerPayment = await razorpay.payments.fetch(payment.providerPaymentId);

        if (providerPayment.status === "authorized") {
          await razorpay.payments.capture(payment.providerPaymentId, payment.amount, payment.currency);
          payment.status = "captured";
        } else if (providerPayment.status === "captured") {
          // Account may be configured for auto-capture.
          payment.status = "captured";
        } else {
          return NextResponse.json(
            { success: false, message: `Payment is in ${providerPayment.status} state and cannot be accepted.` },
            { status: 400 }
          );
        }

        await payment.save();

        booking.status = "accepted";
        booking.paymentStatus = "captured";
        booking.acceptedAt = new Date();
        booking.ownerDecisionAt = new Date();
      } else if (data.status === "rejected") {
        if (booking.status === "pending" && booking.paymentStatus !== "held") {
          return NextResponse.json(
            { success: false, message: "Cannot reject booking before payment is held." },
            { status: 400 }
          );
        }
        let refundFailureMessage = null;
        if (booking.paymentStatus === "held") {
          const payment = await RentalPayment.findById(booking.payment);
          if (payment?.providerPaymentId) {
            const razorpay = getRazorpayInstance();
            try {
              const providerPayment = await razorpay.payments.fetch(payment.providerPaymentId);

              if (providerPayment.status === "captured") {
                const normalizedAmount = Number.isInteger(payment.amount)
                  ? payment.amount
                  : Math.round(Number(payment.amount || 0));
                try {
                  const refund = await razorpay.payments.refund(payment.providerPaymentId, {
                    amount: normalizedAmount > 0 ? normalizedAmount : undefined
                  });
                  payment.providerRefundId = refund.id;
                  payment.status = "refunded";
                  payment.refundAmount = normalizedAmount > 0 ? normalizedAmount : payment.amount;
                } catch (refundError) {
                  // Some accounts reject amount-based refund payloads for full refunds.
                  const fallbackRefund = await razorpay.payments.refund(payment.providerPaymentId, {});
                  payment.providerRefundId = fallbackRefund.id;
                  payment.status = "refunded";
                  payment.refundAmount = normalizedAmount > 0 ? normalizedAmount : payment.amount;
                }
              } else if (providerPayment.status === "authorized") {
                // Authorized payments are not captured yet; do not call refund API.
                // Razorpay auto-releases if not captured. We mark it logically refunded.
                payment.status = "refunded";
                payment.refundAmount = payment.amount;
              } else if (providerPayment.status === "refunded") {
                payment.status = "refunded";
                payment.refundAmount = payment.amount;
              } else {
                payment.status = "refund_pending";
                booking.paymentStatus = "refund_pending";
              }
            } catch (refundFlowError) {
              refundFailureMessage =
                refundFlowError?.error?.description ||
                refundFlowError?.error?.reason ||
                refundFlowError?.description ||
                refundFlowError?.message ||
                "Refund request failed";
              payment.status = "refund_pending";
              booking.paymentStatus = "refund_pending";
            }

            payment.refundReason = data.rejectionReason || "Owner rejected request";
            await payment.save();
          }
          if (booking.paymentStatus !== "refund_pending") {
            booking.paymentStatus = "refunded";
          }
        }

        booking.status = "rejected";
        booking.rejectedAt = new Date();
        booking.ownerDecisionAt = new Date();
        booking.rejectionReason = data.rejectionReason || "";
        if (refundFailureMessage) {
          booking.rejectionReason = `${booking.rejectionReason ? `${booking.rejectionReason} | ` : ""}Refund pending: ${refundFailureMessage}`;
        }
      } else if (data.status === "completed") {
        if (booking.status !== "accepted") {
          return NextResponse.json(
            { success: false, message: "Only accepted bookings can be completed." },
            { status: 400 }
          );
        }
        booking.status = "completed";
        booking.completedAt = new Date();
      } else {
        booking.status = data.status;
      }
    } else {
      booking.status = data.status;
    }

    const updatedBooking = await booking.save();

    const rentalItemName = updatedBooking.tool?.name || updatedBooking.seed?.name || "your request";
    let notificationText = `Your rental request for ${rentalItemName} has been ${data.status}!`;
    if (data.status === "rejected") {
      if (updatedBooking.paymentStatus === "refunded") {
        notificationText = `Your rental request for ${rentalItemName} was rejected. Your refund has been processed.`;
      } else if (updatedBooking.paymentStatus === "refund_pending") {
        notificationText = `Your rental request for ${rentalItemName} was rejected. Refund is pending and will be updated soon.`;
      }
    }

    await Notification.create({
      recipient: updatedBooking.renter,
      text: notificationText,
      type: 'booking', 
      link: ['/completed', '/rejected'].includes(data.status)
        ? '/dashboard/history?tab=purchases'
        : '/dashboard',
      isRead: false
    });

    return NextResponse.json({ success: true, message: `Booking ${data.status}!`, booking: updatedBooking }, { status: 200 });
  } catch (error) {
    console.log("BOOKING PUT ERROR:", error);
    const gatewayMessage =
      error?.error?.description ||
      error?.error?.reason ||
      error?.description ||
      error?.message ||
      "Failed to update booking status.";
    return NextResponse.json({ success: false, message: gatewayMessage }, { status: 500 });
  }
}