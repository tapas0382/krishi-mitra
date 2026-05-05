import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const userVillageName = searchParams.get('villageName') || "your area";

    if (!lat || !lng) {
      return NextResponse.json({ success: false, message: "Location required" }, { status: 400 });
    }

    // We will update this if OpenWeather finds a more accurate name based on coordinates!
    let actualLocationName = userVillageName; 

    // ----------------------------------------------------------------------
    // 🌤️ 1. WEATHER DATA & EXACT LOCATION DETECTOR
    // ----------------------------------------------------------------------
    let weatherData;
    
    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
      const weatherRes = await fetch(weatherUrl);
      
      if (!weatherRes.ok) throw new Error("Weather API key not active yet");
      
      const weatherRaw = await weatherRes.json();
      
      // ✨ THE LOCATION FIX: Grab the actual name of the coordinates from OpenWeather!
      if (weatherRaw.name) {
        actualLocationName = weatherRaw.name;
      }

      weatherData = {
        temperature: Math.round(weatherRaw.main.temp),
        condition: weatherRaw.weather[0].description,
        humidity: weatherRaw.main.humidity,
        icon: getWeatherEmoji(weatherRaw.weather[0].icon)
      };
    } catch (weatherError) {
      console.log("Weather API failed, using fallback data...", weatherError.message);
      // Fallback data
      weatherData = {
        temperature: 32,
        condition: "heavy thunderstorms and strong winds",
        humidity: 85,
        icon: '⛈️'
      };
    }

    // ----------------------------------------------------------------------
    // 🤖 2. REAL AI ANALYSIS (With Crash Protection)
    // ----------------------------------------------------------------------
    let aiData;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Notice we are passing the 'actualLocationName' to the AI now!
      const prompt = `
        You are 'Krishi Mitra', an expert agricultural AI assistant in India.
        Location: ${actualLocationName}
        Current Weather: ${weatherData.condition}, ${weatherData.temperature}°C, ${weatherData.humidity}% humidity.
        
        Based strictly on this weather, provide farming advice. 
        Respond ONLY with a valid JSON object matching this exact format, without any markdown formatting or extra text:
        {
          "advice": "2 sentences of specific agricultural advice based on the weather.",
          "action": "1 specific action sentence (e.g., 'Rent a rotavator today to...').",
          "recommendedTools": ["Tool 1", "Tool 2"],
          "recommendedSeeds": ["Seed 1", "Seed 2"]
        }
      `;

      const aiResult = await model.generateContent(prompt);
      const aiResponseText = aiResult.response.text();
      
      const cleanedJsonStr = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
      aiData = JSON.parse(cleanedJsonStr);

    } catch (aiError) {
      // ✨ THE CRASH FIX: If Gemini is overloaded (503), catch it and use this safe fallback!
      console.warn("⚠️ Gemini API is busy or down. Sending fallback data.");
      
      aiData = {
        advice: "Our AI servers are currently experiencing high demand. Please rely on the live weather data on the left for now.",
        action: "Check back in a few minutes for personalized AI recommendations.",
        recommendedTools: ["Tractor", "Water Pump"], 
        recommendedSeeds: ["Seasonal Vegetables", "Wheat"] 
      };
    }

    // ----------------------------------------------------------------------
    // 📤 3. SEND RESPONSE TO FRONTEND
    // ----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      data: {
        villageName: actualLocationName, // Send the real name back to the UI!
        weather: weatherData,
        ai: aiData
      }
    });

  } catch (error) {
    console.error("SMART API ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to generate live insights" }, { status: 500 });
  }
}

function getWeatherEmoji(iconCode) {
  const map = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
  };
  return map[iconCode] || '🌤️';
}