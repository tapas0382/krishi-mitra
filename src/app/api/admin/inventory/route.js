import { NextResponse } from 'next/server';
import connectDB from '@/lib/db'; // Your exact working DB import
import Tool from '@/models/tool'; // Adjust the casing if your file is Tool.js
import Seed from '@/models/seed'; // Adjust the casing if your file is Seed.js

// GET: Fetch all tools and seeds
export async function GET() {
  try {
    await connectDB();
    
    // Fetch all tools and seeds, populating the owner info so we can display it
    const tools = await Tool.find({}).populate('owner', 'name phone').sort({ createdAt: -1 });
    const seeds = await Seed.find({}).populate('owner', 'name phone').sort({ createdAt: -1 });
    
    return NextResponse.json({ 
      success: true, 
      data: { tools, seeds } 
    });
  } catch (error) {
    console.error("Inventory Fetch Error:", error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a specific tool or seed
export async function DELETE(req) {
  try {
    await connectDB();
    
    // Extract the ID and the type (tool or seed) from the URL
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); 

    if (!id || !type) {
      return NextResponse.json({ success: false, message: 'Missing item ID or type' }, { status: 400 });
    }

    // Delete from the correct MongoDB collection
    if (type === 'tool') {
      await Tool.findByIdAndDelete(id);
    } else if (type === 'seed') {
      await Seed.findByIdAndDelete(id);
    } else {
      return NextResponse.json({ success: false, message: 'Invalid item type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Item removed from platform successfully' });
  } catch (error) {
    console.error("Inventory Delete Error:", error);
    return NextResponse.json({ success: false, message: 'Delete failed' }, { status: 500 });
  }
}