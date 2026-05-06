import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import SeedOrder from "../../../models/seedOrder";
import Notification from "../../../models/notification";
import Seed from "../../../models/seed";
import RentalPayment from "../../../models/rentalPayment";
import { getRazorpayInstance } from "../../../lib/razorpay";

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
      paymentStatus: "unpaid"
    });

    // 2. Ring the Notification Bell for the Seller! 🔔
    await Notification.create({
      recipient: data.sellerId,
      text: `New Order! Someone wants to buy ${data.quantityKg}kg of your seeds.`,
      link: '/dashboard', // Seller handles pending requests in Action Center
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

    const filteredOrders = sellerId
      ? formattedOrders.filter((order) => {
          if (order.status === "pending") {
            return ["held", "captured", "refund_pending", "refunded"].includes(order.paymentStatus);
          }
          return true;
        })
      : formattedOrders;

    return NextResponse.json({ success: true, data: filteredOrders });
  } catch (error) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Approve or Reject the order
export async function PUT(request) {
  try {
    await connectDB();
    const { orderId, status, rejectionReason } = await request.json();

    const order = await SeedOrder.findById(orderId).populate("seed");
    if (!order) {
      return NextResponse.json({ success: false, message: "Seed order not found" }, { status: 404 });
    }

    if (status === "accepted") {
      if (order.paymentStatus !== "held") {
        return NextResponse.json(
          { success: false, message: "Cannot accept seed order before payment is held." },
          { status: 400 }
        );
      }

      const payment = await RentalPayment.findById(order.payment);
      if (!payment?.providerPaymentId) {
        return NextResponse.json({ success: false, message: "Payment record not ready for capture." }, { status: 400 });
      }

      const razorpay = getRazorpayInstance();
      const providerPayment = await razorpay.payments.fetch(payment.providerPaymentId);
      if (providerPayment.status === "authorized") {
        await razorpay.payments.capture(payment.providerPaymentId, payment.amount, payment.currency);
      }
      payment.status = "captured";
      await payment.save();

      order.status = "accepted";
      order.paymentStatus = "captured";
      order.acceptedAt = new Date();
      order.sellerDecisionAt = new Date();
    } else if (status === "rejected") {
      if (order.status === "pending" && order.paymentStatus !== "held") {
        return NextResponse.json(
          { success: false, message: "Cannot reject seed order before payment is held." },
          { status: 400 }
        );
      }

      if (order.paymentStatus === "held") {
        const payment = await RentalPayment.findById(order.payment);
        if (payment?.providerPaymentId) {
          const razorpay = getRazorpayInstance();
          try {
            const providerPayment = await razorpay.payments.fetch(payment.providerPaymentId);
            if (providerPayment.status === "captured") {
              const refund = await razorpay.payments.refund(payment.providerPaymentId, {});
              payment.providerRefundId = refund.id;
              payment.status = "refunded";
              payment.refundAmount = payment.amount;
            } else if (providerPayment.status === "authorized" || providerPayment.status === "refunded") {
              payment.status = "refunded";
              payment.refundAmount = payment.amount;
            } else {
              payment.status = "refund_pending";
              order.paymentStatus = "refund_pending";
            }
          } catch (refundError) {
            payment.status = "refund_pending";
            order.paymentStatus = "refund_pending";
          }

          payment.refundReason = rejectionReason || "Seller rejected order";
          await payment.save();
        }
        if (order.paymentStatus !== "refund_pending") {
          order.paymentStatus = "refunded";
        }
      }

      order.status = "rejected";
      order.rejectedAt = new Date();
      order.sellerDecisionAt = new Date();
      order.rejectionReason = rejectionReason || "";
    } else if (status === "completed") {
      if (order.status !== "accepted") {
        return NextResponse.json({ success: false, message: "Only accepted orders can be completed." }, { status: 400 });
      }
      order.status = "completed";
      order.completedAt = new Date();
    } else {
      order.status = status;
    }

    const updatedOrder = await order.save();

    // Ring the notification bell for the BUYER so they know the result!
    await Notification.create({
      recipient: updatedOrder.buyer,
      text: status === "rejected"
        ? (updatedOrder.paymentStatus === "refunded"
          ? `Your order for ${updatedOrder.seed.name} was rejected. Your refund has been processed.`
          : `Your order for ${updatedOrder.seed.name} was rejected. Refund is pending and will be updated soon.`)
        : `Your order for ${updatedOrder.seed.name} was ${status}!`,
      link: ['completed', 'rejected'].includes(status)
        ? '/dashboard/history?tab=purchases'
        : '/dashboard',
      type: 'system'
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}