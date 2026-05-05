import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import Review from "../../../models/review";
import Booking from "../../../models/booking"; // Needed to verify the booking
import SeedOrder from "../../../models/seedOrder";

// POST: Submit a new review
export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    let item = null;
    let ownerId = null;
    let toolId = null;
    let seedId = null;

    // 1. Check which database to search based on the itemType
    if (data.itemType === 'seed') {
      item = await SeedOrder.findById(data.bookingId);
      if (!item) {
        return NextResponse.json({ success: false, message: "Seed order not found" }, { status: 404 });
      }
      ownerId = item.seller; // In seed orders, the owner is called 'seller'
      seedId = item.seed;
    } else {
      item = await Booking.findById(data.bookingId);
      if (!item) {
        return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
      }
      ownerId = item.owner;
      toolId = item.tool;
    }

    // 2. Verify it is completed
    if (item.status !== 'completed') {
      return NextResponse.json({ success: false, message: "You can only review completed items" }, { status: 400 });
    }

    // 3. Create the review payload dynamically
    const reviewData = {
      reviewer: data.reviewerId,
      owner: ownerId, 
      rating: data.rating,
      comment: data.comment,
      booking: data.bookingId // This stores the ID of the transaction (works for both)
    };

    // Only add the tool or seed ID if they exist
    if (toolId) reviewData.tool = toolId;
    if (seedId) reviewData.seed = seedId;

    // 4. Save the review
    const newReview = await Review.create(reviewData);

    return NextResponse.json(
      { success: true, message: "Review submitted successfully!", review: newReview },
      { status: 201 }
    );
  } catch (error) {
    // Check if it's a duplicate review error (our unique index triggered)
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "You have already reviewed this item." }, { status: 400 });
    }
    console.log("REVIEW POST ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET: Fetch reviews for a specific tool or owner
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('toolId');
    const ownerId = searchParams.get('ownerId');

    let query = {};
    if (toolId) query.tool = toolId;
    if (ownerId) query.owner = ownerId;

    // Bring in the reviewer's name so we can display who wrote it
    const reviews = await Review.find(query)
      .populate('reviewer', 'name villageName')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: reviews }, { status: 200 });
  } catch (error) {
    console.log("REVIEW GET ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}