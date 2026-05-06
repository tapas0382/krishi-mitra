'use client';
import { useState, useEffect } from 'react';
import Navbar from '../../components/navbar'; 

export default function Marketplace() {
  const [user, setUser] = useState(null);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationStr, setLocationStr] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [radius, setRadius] = useState(10); 

  // Booking Modal State
  const [selectedTool, setSelectedTool] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingHours, setBookingHours] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');

  // NEW: Reviews State
  const [toolReviews, setToolReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchTools();
  }, []);

  // NEW: Fetch reviews automatically when a tool is clicked
  useEffect(() => {
    if (selectedTool) {
      fetchToolReviews(selectedTool._id);
    }
  }, [selectedTool]);

  const fetchTools = async (lat = null, lng = null, rad = radius) => {
    setLoading(true);
    try {
      let url = '/api/tools';
      if (lat && lng) url += `?lat=${lat}&lng=${lng}&radius=${rad}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setTools(data.data);
    } catch (error) {
      console.error("Error fetching tools", error);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Function to get reviews from the API
  const fetchToolReviews = async (toolId) => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews?toolId=${toolId}`);
      const data = await res.json();
      if (data.success) {
        setToolReviews(data.data);
      }
    } catch (error) {
      console.error("Error fetching reviews", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setLocationStr('Locating...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ lat, lng });
          setLocationStr(`📍 Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`);
          fetchTools(lat, lng, radius);
        },
        () => setLocationStr('❌ Location blocked')
      );
    }
  };

  const handleRadiusChange = (e) => {
    const newRadius = e.target.value;
    setRadius(newRadius);
    if (coords.lat && coords.lng) fetchTools(coords.lat, coords.lng, newRadius);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to book a tool!");
      return;
    }
    if (user.id === selectedTool.owner._id) {
      setBookingMessage("❌ You cannot book your own tool!");
      return;
    }

    setBookingLoading(true);
    setBookingMessage('');

    try {
      const checkoutRes = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: selectedTool._id,
          renterId: user.id,
          startDate: bookingDate,
          hoursRequested: Number(bookingHours)
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutData.success) {
        setBookingMessage('❌ ' + checkoutData.message);
        return;
      }

      await loadRazorpayScript();

      const razorpay = new window.Razorpay({
        key: checkoutData.keyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: "Krishi Mitra",
        description: `Rental hold for ${selectedTool.name}`,
        order_id: checkoutData.razorpayOrderId,
        prefill: {
          name: user.name || "",
          contact: user.phone || ""
        },
        handler: async (response) => {
          const verifyRes = await fetch('/api/bookings/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: checkoutData.bookingId,
              ...response
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            setBookingMessage('✅ Payment successful. Request sent to owner for approval.');
            setTimeout(() => {
              setSelectedTool(null);
              setBookingMessage('');
            }, 2000);
          } else {
            setBookingMessage('❌ Payment verification failed: ' + verifyData.message);
          }
        },
        theme: {
          color: "#16a34a"
        }
      });

      razorpay.on("payment.failed", function () {
        setBookingMessage("❌ Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (error) {
      setBookingMessage('❌ Something went wrong.');
    } finally {
      setBookingLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Failed to load Razorpay checkout SDK"));
      document.body.appendChild(script);
    });
  };

  // Helper to render stars
  const renderStars = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Find Tools Near You</h1>
          <p className="text-slate-600">Rent high-quality agricultural equipment from farmers in your area.</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-10 flex flex-col md:flex-row gap-4 items-center">
          <button onClick={handleGetLocation} className="w-full md:w-auto bg-slate-100 border border-slate-300 text-slate-700 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 transition">
            📍 Use My Location
          </button>
          <input type="text" readOnly value={locationStr} placeholder="Click 'Use My Location' to search nearby..." className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 outline-none text-slate-600" />
          <div className="w-full md:w-auto flex items-center gap-3">
            <label className="text-slate-600 font-medium whitespace-nowrap">Radius:</label>
            <select value={radius} onChange={handleRadiusChange} className="p-3 border border-slate-300 rounded-lg outline-none bg-white text-slate-900 min-w-[100px] cursor-pointer">
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="20">20 km</option>
              <option value="50">50 km</option>
            </select>
          </div>
        </div>

        {/* Tools Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium">Searching for tools...</div>
        ) : tools.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500 text-lg">No tools found in this area.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <div key={tool._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 w-full bg-slate-200">
                  <img src={tool.imageUrl} alt={tool.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{tool.name}</h3>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">{tool.category}</span>
                  </div>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{tool.description}</p>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-sm text-slate-700"><strong>Owner:</strong> {tool.owner?.name}</p>
                    <p className="text-sm text-slate-700"><strong>Village:</strong> {tool.villageName}</p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-green-600 font-extrabold text-xl">₹{tool.pricePerHour}<span className="text-sm text-slate-500 font-normal">/hr</span></span>
                    <button 
                      onClick={() => setSelectedTool(tool)}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors  cursor-pointer"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal Popup */}
      {selectedTool && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Side: Booking Form */}
            <div className="p-6 md:w-1/2 bg-white">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Request to Rent</h2>
                <button onClick={() => setSelectedTool(null)} className="md:hidden text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">×</button>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
                <h3 className="font-bold text-slate-800">{selectedTool.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Owned by {selectedTool.owner?.name}</p>
                <p className="text-green-600 font-bold mt-2">₹{selectedTool.pricePerHour} per hour</p>
              </div>

              {bookingMessage && (
                <div className={`p-3 mb-4 rounded-lg text-sm font-medium ${bookingMessage.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {bookingMessage}
                </div>
              )}

              <form onSubmit={submitBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">When do you need it?</label>
                  <input type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full p-3 border border-slate-300 text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">How many hours?</label>
                  <input type="number" min="1" required value={bookingHours} onChange={(e) => setBookingHours(e.target.value)} className="w-full p-3 border border-slate-300 text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <div className="flex justify-between items-center py-4 border-t border-b border-slate-100 mt-4">
                  <span className="font-medium text-slate-700">Estimated Cost:</span>
                  <span className="font-extrabold text-2xl text-slate-900">₹{selectedTool.pricePerHour * bookingHours}</span>
                </div>

                <button type="submit" disabled={bookingLoading} className="w-full bg-green-600 text-white p-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:bg-slate-400 mt-2 cursor-pointer">
                  {bookingLoading ? 'Starting Checkout...' : 'Pay & Send Rental Request'}
                </button>
              </form>
            </div>

            {/* Right Side: Reviews Section */}
            <div className="p-6 md:w-1/2 bg-slate-50 border-l border-slate-100 flex flex-col max-h-[600px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Community Reviews</h3>
                <button onClick={() => setSelectedTool(null)} className="hidden md:block text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">×</button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 space-y-4">
                {reviewsLoading ? (
                  <p className="text-sm text-slate-500 text-center py-4">Loading reviews...</p>
                ) : toolReviews.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-sm">No reviews yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Be the first to rent and review!</p>
                  </div>
                ) : (
                  toolReviews.map(review => (
                    <div key={review._id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-slate-900">{review.reviewer?.name || "A Farmer"}</span>
                        <span className="text-yellow-500 text-xs">{renderStars(review.rating)}</span>
                      </div>
                      <p className="text-sm text-slate-600 italic">"{review.comment}"</p>
                      <p className="text-xs text-slate-400 mt-2">From {review.reviewer?.villageName || "Unknown Village"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}