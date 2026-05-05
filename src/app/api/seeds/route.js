import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import Seed from "../../../models/seed";
import User from "../../../models/user";

// POST: Upload a new seed offer or request
export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    const newSeed = await Seed.create({
      name: data.name,
      owner: data.ownerId,
      type: data.type, // 'offer' or 'request'
      quantity: data.quantity,
      price: data.price || 0,
      imageUrl: data.imageUrl,
      description: data.description,
      villageName: data.villageName,
      location: {
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
      }
    });

    return NextResponse.json({ success: true, data: newSeed }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET: Find seeds near a location
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || 10;
    const type = searchParams.get('type'); // filter by 'offer' or 'request'

    let query = { isAvailable: true };
    if (type) query.type = type;

    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius) * 1000
        }
      };
    }

    const seeds = await Seed.find(query).populate('owner', 'name phone');
    return NextResponse.json({ success: true, data: seeds });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}