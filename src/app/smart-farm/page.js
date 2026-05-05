'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/navbar';

export default function SmartFarm() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [smartData, setSmartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState("Fetching location...");
  
  // NEW: State for Pincode Input
  const [pincodeInput, setPincodeInput] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    // 🛡️ SECURITY LOCK: Kick out non-logged-in users
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      handleGPSClick(parsedUser.villageName); // Auto-load GPS on first visit
    }
  }, [router]);

  // --- LOCATION LOGIC ---
  
  // 1. GPS Button Logic
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

  // 2. Pincode Submit Logic (Uses free OpenStreetMap to get Lat/Lng)
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
        // Grab a readable name for the UI from the map data
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

  // 3. Your original data fetcher
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 flex justify-center items-center gap-3">
            <span className="text-blue-500">✨</span> AI Krishi Mitra
          </h1>
          <p className="text-slate-600">Smart weather alerts and AI-driven farming recommendations.</p>
        </div>

        {/* 👇 NEW: Search Bar UI */}
        <div className="max-w-xl mx-auto mb-10 bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-slate-900">
          <form onSubmit={handlePincodeSubmit} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              maxLength="6"
              placeholder="Enter 6-digit Pincode..."
              value={pincodeInput}
              // The replace function ensures they can ONLY type numbers!
              onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))} 
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm">
              Search
            </button>
            <button 
              type="button" 
              onClick={() => handleGPSClick()} 
              className="bg-slate-100 text-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-200"
              title="Use GPS Location"
            >
              📍 <span className="sm:hidden">Use GPS</span>
            </button>
          </form>
          {searchError && <p className="text-red-500 text-sm mt-3 text-center font-bold">{searchError}</p>}
        </div>
        {/* 👆 END Search Bar UI */}

        {loading ? (
          <div className="text-center py-16 text-slate-500 font-medium animate-pulse">
            <div className="text-5xl mb-6">🤖</div>
            Analyzing weather patterns and satellite data...
            <p className="text-sm text-blue-500 font-bold mt-3">{locationStatus}</p>
          </div>
        ) : !smartData ? (
          <div className="text-center py-20 text-red-500">Failed to load AI data.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Live Weather */}
            <div className="md:col-span-1">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -top-10 -right-10 text-9xl opacity-20">{smartData.weather.icon}</div>
                
                <h2 className="text-lg font-bold opacity-90 mb-6">Current Conditions</h2>
                <p className="text-sm font-medium opacity-100 bg-white/20 px-3 py-1 rounded-full w-fit mb-1 truncate max-w-full">
                  📍 {smartData.villageName || user.villageName}
                </p>
                
                <div className="flex items-end gap-2 mb-6 mt-4">
                  <span className="text-6xl font-extrabold">{smartData.weather.temperature}°</span>
                  <span className="text-xl opacity-80 mb-2">C</span>
                </div>
                
                <p className="text-xl font-medium leading-snug mb-4">{smartData.weather.condition}</p>
                
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl w-fit backdrop-blur-sm">
                  <span>💧</span> Humidity: {smartData.weather.humidity}%
                </div>
              </div>
            </div>

            {/* Right Column: AI Insights */}
            <div className="md:col-span-2 space-y-6">
              
              {/* AI Advice Card */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-100 relative">
                <div className="absolute top-8 right-8 text-3xl opacity-20">🧠</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg text-sm">AI Analysis</span>
                </h2>
                <p className="text-lg text-slate-700 leading-relaxed mb-6">
                  {smartData.ai.advice}
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 border-l-4 border-l-amber-500">
                  <p className="font-bold text-amber-900 flex items-center gap-2">
                    <span>⚡</span> Recommended Action:
                  </p>
                  <p className="text-amber-800 mt-1">{smartData.ai.action}</p>
                </div>
              </div>

              {/* Quick Links / AI Suggested Searches */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-2">🚜 Tools Needed Today</h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {smartData.ai.recommendedTools.map(tool => (
                      <Link key={tool} href="/tools" className="bg-slate-100 hover:bg-green-100 text-slate-700 hover:text-green-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                        Search {tool} →
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-2">🌱 Optimal Seeds</h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {smartData.ai.recommendedSeeds.map(seed => (
                      <Link key={seed} href="/seeds" className="bg-slate-100 hover:bg-green-100 text-slate-700 hover:text-green-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                        Find {seed} →
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}