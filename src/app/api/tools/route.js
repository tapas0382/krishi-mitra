import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Tool from "@/models/tool";
import User from "../../../models/user"; // Adjust path if needed based on your folder structure

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    // Make sure we have the exact GPS coordinates for the radius search
    if (!data.latitude || !data.longitude) {
      return NextResponse.json(
        { success: false, message: "Location coordinates are required!" },
        { status: 400 }
      );
    }

    // Format the data exactly how our Tool.js model expects it
    const newTool = await Tool.create({
      name: data.name,
      owner: data.ownerId, 
      category: data.category,
      pricePerHour: data.pricePerHour,
      imageUrl: data.imageUrl, 
      description: data.description,
      villageName: data.villageName,
      location: {
        type: 'Point',
        coordinates: [data.longitude, data.latitude] // MongoDB requires [longitude, latitude] order
      }
    });

    return NextResponse.json(
      { success: true, message: "Tool listed successfully!", tool: newTool },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();
    
    // Get search parameters from the URL
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radiusInKm = searchParams.get('radius') || 10; 
    const ownerId = searchParams.get('ownerId'); // <-- Added this!

    let query = {};

    // SCENARIO 1: Fetching for the "My Listings" Dashboard
    if (ownerId) {
      query.owner = ownerId;
      // We do NOT filter by isAvailable here, so the farmer can see 
      // all their tools, even the ones currently rented out.
    } 
    // SCENARIO 2: Fetching for the Public Marketplace Map
    else {
      query.isAvailable = true; // Only show available tools to buyers

      // If we have coordinates, use MongoDB's geospatial search
      if (lat && lng) {
        query.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            // MongoDB expects distance in meters
            $maxDistance: parseInt(radiusInKm) * 1000 
          }
        };
      }
    }

    // Fetch the tools, newest first, and include the owner's details
    const tools = await Tool.find(query)
      .sort({ createdAt: -1 })
      .populate('owner', 'name phone');

    return NextResponse.json({ success: true, data: tools }, { status: 200 });
  } catch (error) {
    console.log("SEARCH ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// <-- ADDED THIS NEW FUNCTION SO "DELIST" WORKS -->
export async function DELETE(request) {
  try {
    await connectDB();
    
    // Grab the ID from the URL (e.g., /api/tools?id=123)
    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('id');

    if (!toolId) {
      return NextResponse.json(
        { success: false, message: "Tool ID is required to delete." }, 
        { status: 400 }
      );
    }

    // Delete it from MongoDB
    const deletedTool = await Tool.findByIdAndDelete(toolId);

    if (!deletedTool) {
      return NextResponse.json(
        { success: false, message: "Tool not found." }, 
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Tool successfully delisted." }, 
      { status: 200 }
    );

  } catch (error) {
    console.log("DELETE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}