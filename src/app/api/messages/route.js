import { NextResponse } from "next/server";
import connectDB from "../../../lib/db";
import Message from "../../../models/message";
import User from "../../../models/user"; // Need this to populate names

// POST: Send a new message
export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();

    if (!data.senderId || !data.receiverId || !data.content) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const newMessage = await Message.create({
      sender: data.senderId,
      receiver: data.receiverId,
      content: data.content,
    });

    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error) {
    console.error("MESSAGE POST ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET: Fetch conversation history OR fetch unique chat contacts
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const user1 = searchParams.get('user1');
    const user2 = searchParams.get('user2');
    const singleUserId = searchParams.get('userId'); 
    const unreadFor = searchParams.get('unreadFor');

    // SCENARIO 1: Navbar asking for the absolute latest message
    if (unreadFor) {
      const lastMessage = await Message.findOne({
        $or: [{ sender: unreadFor }, { receiver: unreadFor }]
      }).sort({ createdAt: -1 });

      return NextResponse.json({ success: true, data: lastMessage });
    }

    // SCENARIO 2: Sidebar Contacts list
    if (singleUserId) {
      const messages = await Message.find({
        $or: [{ sender: singleUserId }, { receiver: singleUserId }]
      })
      .populate('sender', 'name')
      .populate('receiver', 'name')
      .sort({ createdAt: -1 });

      const uniqueContacts = new Map();

      messages.forEach(msg => {
        if (!msg.sender || !msg.receiver) return;

        const isSender = msg.sender._id.toString() === singleUserId;
        const contact = isSender ? msg.receiver : msg.sender;

        if (contact && !uniqueContacts.has(contact._id.toString())) {
          uniqueContacts.set(contact._id.toString(), {
            id: contact._id,
            name: contact.name
          });
        }
      });

      return NextResponse.json({ success: true, data: Array.from(uniqueContacts.values()) });
    }

    // SCENARIO 3: Chat history between two specific users
    if (!user1 || !user2) {
      return NextResponse.json({ success: false, message: "Missing user IDs" }, { status: 400 });
    }

    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    })
    .populate('sender', 'name')
    .populate('receiver', 'name')
    .sort({ createdAt: 1 }); 

    return NextResponse.json({ success: true, data: messages });
    
  } catch (error) {
    console.error("MESSAGE GET ERROR:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}