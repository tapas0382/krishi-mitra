import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    // Notice we are now receiving 'history' from the frontend
    const { message, villageName, weather, history } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format the previous chat history so the AI remembers the conversation
    const historyText = history && history.length > 0 
      ? history.map(m => `${m.role === 'user' ? 'Farmer' : 'AI'}: ${m.text}`).join('\n') 
      : 'No previous history.';

    // Get the actual current month
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    const prompt = `
      You are 'Krishi Mitra', a helpful AI agricultural assistant.
      Context: Location ${villageName || 'India'}, Month ${currentMonth}, Weather ${weather?.condition || 'clear'}.
      
      Conversation History:
      ${historyText}

      INSTRUCTIONS:
      1. If the user says "hi", "hello", or "how are you", respond naturally and briefly like a friend. (e.g., "I am doing great! How can I help with your farm today?")
      2. If history exists, DO NOT repeat introductions or "Namaste".
      3. Only give farming advice if the user asks for it or if it's the start of the chat.
      4. Avoid repeating the exact same advice twice in a row. 
      5. Use plain text and emojis only. NO bolding, NO asterisks.
      6.LANGUAGE: Respond in the SAME language the user uses. If they ask in Odia, reply in Odia. If Hindi, reply in Hindi.

      User's New Message: "${message}"
    `;

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text();
    const cleanText = text.replace(/\*/g, '').trim();

    return NextResponse.json({ success: true, text: cleanText });

  } catch (error) {
    console.error("CHAT API ERROR:", error);
    return NextResponse.json({ 
      success: false, 
      text: "My servers are a little busy right now! 🚜 Please try asking again in a moment." 
    });
  }
}