'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/navbar';

export default function SmartFarm() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [smartData, setSmartData] = useState(null);
  const [loading, setLoading] = useState(false); 
  const [locationStatus, setLocationStatus] = useState("");
  
  const [pincodeInput, setPincodeInput] = useState('');
  const [searchError, setSearchError] = useState('');

  // ✨ NEW: State to control if the chat drawer is open or closed
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedChat = localStorage.getItem('krishiChat');
      if (savedChat) return JSON.parse(savedChat);
    }
    return [
      { role: 'ai', text: "Namaste! 🙏 I am your AI Krishi Mitra. Ask me what crops to plant, how to prepare your soil, or what seeds are best!" }
    ];
  });

  useEffect(() => {
    if (messages.length > 1) { // Don't save if it's just the default welcome message
      localStorage.setItem('krishiChat', JSON.stringify(messages));
    }
  }, [messages]);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    }
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]); // Auto-scroll when messages change OR when chat is opened

  // ✨ FIX: Snaps back to exactly 48px when empty!
  useEffect(() => {
    if (textareaRef.current) {
      if (!chatInput) {
        // If the box is totally empty (you erased everything), force the original height
        textareaRef.current.style.height = '48px';
      } else {
        // If there is text, calculate the auto-expanding height
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }
  }, [chatInput]);

  const handleGPSClick = (fallbackVillage = user?.villageName) => {
    setLoading(true);
    setSearchError('');
    setLocationStatus("Fetching precise GPS location...");
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchSmartData(position.coords.latitude, position.coords.longitude, fallbackVillage);
        },
        () => {
          setLocationStatus("Location blocked. Using default settings.");
          fetchSmartData(20.29, 85.82, fallbackVillage); 
        }
      );
    }
  };

  const handlePincodeSubmit = async (e) => {
    e.preventDefault();
    if (pincodeInput.length !== 6) {
      setSearchError("Please enter a valid 6-digit Pincode.");
      return;
    }

    setLoading(true);
    setSearchError('');
    setLocationStatus(`Scanning satellite data for Pincode: ${pincodeInput}...`);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincodeInput}&country=India&format=json`);
      const geoData = await res.json();

      if (geoData && geoData.length > 0) {
        const lat = geoData[0].lat;
        const lng = geoData[0].lon;
        const areaName = geoData[0].name || geoData[0].display_name.split(',')[0] || `Area ${pincodeInput}`;
        
        fetchSmartData(lat, lng, areaName);
      } else {
        setLoading(false);
        setSearchError("Could not find location data for this Pincode. Try another.");
      }
    } catch (error) {
      setLoading(false);
      setSearchError("Network error. Please try again.");
    }
  };

  const fetchSmartData = async (lat, lng, villageName) => {
    try {
      const res = await fetch(`/api/smart-farm?lat=${lat}&lng=${lng}&villageName=${villageName}`);
      const data = await res.json();
      if (data.success) {
        setSmartData(data.data);
      }
    } catch (error) {
      console.error("Error fetching smart data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          villageName: smartData?.villageName || user.villageName,
          weather: smartData?.weather,
          history: messages 
        })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, my servers are a bit busy. Please try asking again!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden relative">
      <Navbar />
      
      {/* ========================================== */}
      {/* MAIN DASHBOARD (Now takes full center width)*/}
      {/* ========================================== */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 overflow-y-auto custom-scrollbar pb-24">
        
        <div className="text-center mt-2 mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 flex items-center justify-center gap-3">
            <span className="text-blue-500">✨</span> AI Krishi Mitra
          </h1>
          <p className="text-slate-600">Smart weather alerts and AI-driven farming recommendations.</p>
        </div>

        {/* Search Bar UI */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto mb-10">
          <form onSubmit={handlePincodeSubmit} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              maxLength="6"
              placeholder="Enter 6-digit Pincode..."
              value={pincodeInput}
              onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))} 
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-slate-900"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer">
              Search
            </button>
            <button 
              type="button" 
              onClick={() => handleGPSClick()} 
              className="bg-slate-100 text-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
              title="Use GPS Location"
            >
              📍 <span className="sm:hidden">Use GPS</span>
            </button>
          </form>
          {searchError && <p className="text-red-500 text-sm mt-3 text-center font-bold">{searchError}</p>}
        </div>

        {/* Dynamic Content Area */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-medium animate-pulse bg-white rounded-3xl border border-slate-200 max-w-2xl mx-auto">
            <div className="text-5xl mb-6">🤖</div>
            Analyzing weather patterns and satellite data...
            <p className="text-sm text-blue-500 font-bold mt-3">{locationStatus}</p>
          </div>
        ) : !smartData ? (
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[300px] max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready to analyze your farm!</h2>
            <p className="text-slate-600 max-w-md">Enter your Pincode above or click "Use GPS" to get localized weather and instant AI insights.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Weather Card */}
            <div className="md:col-span-1 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[280px]">
              <div className="absolute -top-10 -right-10 text-9xl opacity-20">{smartData.weather.icon}</div>
              <div>
                <h2 className="text-lg font-bold opacity-90 mb-4">Current Conditions</h2>
                <p className="text-sm font-medium opacity-100 bg-white/20 px-3 py-1 rounded-full w-fit mb-1 truncate max-w-full">
                  📍 {smartData.villageName || user.villageName}
                </p>
              </div>
              <div className="mt-auto">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-7xl font-extrabold">{smartData.weather.temperature}°</span>
                  <span className="text-2xl opacity-80 mb-2">C</span>
                </div>
                <p className="text-2xl font-medium leading-snug mb-4 capitalize">{smartData.weather.condition}</p>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl w-fit backdrop-blur-sm">
                  <span>💧</span> Humidity: {smartData.weather.humidity}%
                </div>
              </div>
            </div>

            {/* AI Insight Card */}
            <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 relative flex flex-col justify-between">
              <div className="absolute top-6 right-6 text-4xl opacity-10">🧠</div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg text-sm">AI Analysis</span>
                </h2>
                <p className="text-lg text-slate-700 leading-relaxed mb-6">{smartData.ai.advice}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 border-l-4 border-l-amber-500 mt-auto">
                <p className="font-bold text-amber-900 flex items-center gap-2"><span>⚡</span> Recommended Action:</p>
                <p className="text-amber-800 mt-1">{smartData.ai.action}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================== */}
      {/* FLOATING CHAT BUTTON                       */}
      {/* ========================================== */}
      {/* Only show the button if the chat drawer is closed */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className={`fixed cursor-pointer bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 z-40 flex items-center justify-center gap-3 group ${isChatOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <span className="text-3xl drop-shadow-md">🤖</span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-bold">
          Ask Krishi Mitra
        </span>
      </button>

      {/* ========================================== */}
      {/* SLIDING CHAT DRAWER                        */}
      {/* ========================================== */}
      {/* Background Dark Overlay (Only visible on mobile when chat is open) */}
      {isChatOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsChatOpen(false)}
        ></div>
      )}

      {/* The Actual Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] xl:w-[450px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transition-transform duration-300 ease-in-out transform ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Chat Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between flex-shrink-0 shadow-md z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-bold text-lg">AI Krishi Mitra</h3>
              <p className="text-xs text-blue-300">Online & Ready</p>
            </div>
          </div>
          <button 
            onClick={() => setIsChatOpen(false)}
            className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer"
            title="Close Chat"
          >
            ✕
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-50 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-sm shadow-sm flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-2" />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0 pb-6">
          {/* Input Box - Auto Expanding (Fixed) */}
          <form 
            onSubmit={handleSendMessage} 
            className="p-4 border-t bg-white flex items-end gap-2 flex-shrink-0"
          >
            <textarea 
              ref={textareaRef}
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); // Stops it from making a new line
                  if (chatInput.trim()) {
                    handleSendMessage(e);
                  }
                }
              }}
              rows={1}
              className="flex-1 p-3 bg-slate-100 rounded-xl outline-none resize-none custom-scrollbar text-[13px] leading-relaxed text-slate-900" 
              placeholder="Ask in Odia, Hindi or English..."
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button 
              type="submit"
              disabled={isTyping || !chatInput.trim()}
              className="bg-blue-600 text-white px-5 h-[48px] rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center justify-center flex-shrink-0 shadow-sm cursor-pointer"
            >
              Send 🚀
            </button>
          </form>
        </div>
      </div>
      {/* ========================================== */}

    </div>
  );
}