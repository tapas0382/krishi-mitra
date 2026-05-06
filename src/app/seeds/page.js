'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navbar';
import Link from 'next/link';

export default function SeedExchange() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Search parameters
  const [viewType, setViewType] = useState('offer'); // 'offer' = Available, 'request' = Needed
  const [locationStr, setLocationStr] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [radius, setRadius] = useState(20); // Default 20km for seeds

  // NEW: State to manage the ordering pop-up
  const [orderModalSeed, setOrderModalSeed] = useState(null);
  const [packetSize, setPacketSize] = useState(0.5);
  const [packetCount, setPacketCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch seeds whenever the viewType changes
  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchSeeds(coords.lat, coords.lng, radius, viewType);
  }, [viewType]);

  const fetchSeeds = async (lat = null, lng = null, rad = radius, type = viewType) => {
    setLoading(true);
    try {
      let url = `/api/seeds?type=${type}`;
      if (lat && lng) url += `&lat=${lat}&lng=${lng}&radius=${rad}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSeeds(data.data);
      }
    } catch (error) {
      console.error("Error fetching seeds", error);
    } finally {
      setLoading(false);
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
          fetchSeeds(lat, lng, radius, viewType);
        },
        () => setLocationStr('❌ Location blocked')
      );
    }
  };

  const handleRadiusChange = (e) => {
    const newRadius = e.target.value;
    setRadius(newRadius);
    if (coords.lat && coords.lng) {
      fetchSeeds(coords.lat, coords.lng, newRadius, viewType);
    }
  };

  // NEW: Open the modal instead of routing to messages
  const handleOpenOrder = (seed) => {
    if (!user) {
      alert("Please login to buy seeds!");
      router.push('/login');
      return;
    }
    if (user.id === seed.owner._id) {
      alert("You cannot buy your own seeds!");
      return;
    }
    setOrderModalSeed(seed);

    // Smart default: If they have 1kg+, default to 1kg. Otherwise default to 250gm.
    if (seed.quantity >= 1) setPacketSize(1);
    else if (seed.quantity >= 0.5) setPacketSize(0.5);
    else setPacketSize(0.25);
    
    setPacketCount(1); // Reset to 1 packet
  };

  // NEW: Submit the formal order to the API
  const handleConfirmOrder = async (finalWeight) => {
    setIsSubmitting(true);

    // const packetCount = parseInt(orderQuantity);
    // const pricePerPacket = parseFloat(orderModalSeed.price);
    // const totalWeight = packetCount * orderModalSeed.quantity;
    // const totalCost = packetCount * pricePerPacket;

    try {
      const checkoutRes = await fetch('/api/seed-orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedId: orderModalSeed._id,
          buyerId: user.id,
          quantityKg: finalWeight
        })
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutData.success) {
        alert("Error: " + checkoutData.message);
        return;
      }

      await loadRazorpayScript();

      const razorpay = new window.Razorpay({
        key: checkoutData.keyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: "Krishi Mitra",
        description: `Seed order hold for ${orderModalSeed.name}`,
        order_id: checkoutData.razorpayOrderId,
        prefill: {
          name: user.name || "",
          contact: user.phone || ""
        },
        handler: async (response) => {
          const verifyRes = await fetch('/api/seed-orders/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              seedOrderId: checkoutData.seedOrderId,
              ...response
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            alert(`Payment successful! ${orderModalSeed.owner?.name || 'The seller'} has been notified.`);
            setOrderModalSeed(null);
          } else {
            alert("Payment verification failed: " + verifyData.message);
          }
        },
        theme: { color: "#16a34a" }
      });

      razorpay.on("payment.failed", function () {
        alert("Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (error) {
      console.error("Order failed", error);
      alert("Failed to place order.");
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">🌱 Seed Exchange</h1>
          <p className="text-slate-600">Preserve and share local seed varieties with farmers in your area.</p>
        </div>

        {/* Toggle Switch (Offers vs Requests) */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
            <button 
              onClick={() => setViewType('offer')}
              className={`px-6 py-3 cursor-pointer rounded-lg font-bold transition-all ${viewType === 'offer' ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Available Seeds
            </button>
            <button 
              onClick={() => setViewType('request')}
              className={`px-6 py-3 cursor-pointer rounded-lg font-bold transition-all ${viewType === 'request' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Seeds Needed
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-10 flex flex-col md:flex-row gap-4 items-center">
          <button onClick={handleGetLocation} className="w-full md:w-auto bg-slate-100 border border-slate-300 text-slate-700 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 transition cursor-pointer">
            📍 Use My Location
          </button>
          <input type="text" readOnly value={locationStr} placeholder="Find seeds near me..." className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 outline-none text-slate-600" />
          <div className="w-full md:w-auto flex items-center gap-3">
            <label className="text-slate-600 font-medium whitespace-nowrap">Radius:</label>
            <select value={radius} onChange={handleRadiusChange} className="p-3 border border-slate-300 rounded-lg outline-none bg-white text-slate-900 min-w-[100px]">
              <option value="10">10 km</option>
              <option value="20">20 km</option>
              <option value="50">50 km</option>
              <option value="100">100 km</option>
            </select>
          </div>
        </div>

        {/* Seeds Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium">Searching for seeds...</div>
        ) : seeds.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500 text-lg">No seeds found in this category.</p>
            <p className="text-slate-400 text-sm mt-2">Try expanding your search radius or switching tabs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seeds.map((seed) => (
              <div key={seed._id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${viewType === 'request' ? 'border-orange-200' : 'border-slate-200'}`}>
                {seed.imageUrl && (
                  <div className="h-48 w-full bg-slate-200 border-b border-slate-100">
                    <img src={seed.imageUrl} alt={seed.name} className="h-full w-full object-cover" />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{seed.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${viewType === 'offer' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {seed.quantity}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{seed.description}</p>
                  
                  <div className="bg-slate-50 p-3 rounded-lg mb-6 border border-slate-100 space-y-1">
                    <p className="text-sm text-slate-700"><strong>Farmer:</strong> {seed.owner?.name}</p>
                    <p className="text-sm text-slate-700"><strong>Village:</strong> {seed.villageName}</p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-extrabold text-xl">
                      {seed.price === 0 ? (
                        <span className="text-green-600">Free / Barter</span>
                      ) : (
                        <span className="text-slate-900">₹{seed.price}</span>
                      )}
                    </span>
                    <button 
                    onClick={() => handleOpenOrder(seed)}
                    className={`px-4 cursor-pointer py-2 rounded-lg font-medium transition-colors ${viewType === 'offer' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                      Order Seeds
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {/* THE GROCERY-STYLE ORDER MODAL */}
      {orderModalSeed && (() => {
        // 1. Calculate the true price per KG from the database
        // (e.g., if DB says 0.5kg is ₹20, then 1kg is ₹40)
        const pricePerKg = (parseFloat(orderModalSeed.price) || 0) / (parseFloat(orderModalSeed.quantity) || 1);
        
        // 2. Calculate what the user is ordering right now
        const totalWeight = packetSize * packetCount;
        const totalPrice = totalWeight * pricePerKg;
        
        // 3. Check if they can add more without exceeding the farmer's stock
        const canAddMore = (packetSize * (packetCount + 1)) <= orderModalSeed.quantity;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Order {orderModalSeed.name}</h2>
              <p className="text-sm text-slate-500 mb-6 border-b border-slate-100 pb-4">
                Total stock available from farmer: <span className="font-bold text-slate-800">{orderModalSeed.quantity} kg</span>
              </p>

              {/* 1. THE DROPDOWN (Packet Size) */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Packet Size</label>
                <select 
                  value={packetSize}
                  onChange={(e) => {
                    setPacketSize(Number(e.target.value));
                    setPacketCount(1); // Reset count when changing packet size
                  }}
                  className="w-full p-4 border border-slate-300 rounded-xl font-bold text-lg text-slate-900 focus:ring-2 focus:ring-green-500 outline-none bg-slate-50 cursor-pointer"
                >
                  <option value={0.25}>250 Grams</option>
                  <option value={0.5}>500 Grams</option>
                  <option value={1}>1 Kilogram</option>
                  <option value={2}>2 Kilograms</option>
                  <option value={5}>5 Kilograms</option>
                </select>
              </div>

              {/* 2. THE MULTIPLIER (How many packets?) */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Quantity (Packets)</label>
                <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl">
                  <button 
                    onClick={() => setPacketCount(Math.max(1, packetCount - 1))}
                    disabled={packetCount <= 1}
                    className="w-12 h-12 bg-white rounded-xl shadow-sm text-2xl font-bold text-slate-600 hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center text-xl font-black text-slate-800">
                    {packetCount}
                  </div>
                  <button 
                    onClick={() => setPacketCount(packetCount + 1)}
                    disabled={!canAddMore}
                    className="w-12 h-12 bg-white rounded-xl shadow-sm text-2xl font-bold text-slate-600 hover:text-green-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {!canAddMore && (
                  <p className="text-xs text-red-500 font-bold mt-2 text-center">Maximum stock reached!</p>
                )}
              </div>

              {/* 3. FINAL PRICE SUMMARY */}
              <div className="bg-green-50 p-4 rounded-xl flex justify-between items-center mb-8 border border-green-100">
                <div>
                  <span className="block text-sm font-bold text-green-800">Total Order</span>
                  <span className="block text-xs text-green-600">{totalWeight} kg selected</span>
                </div>
                <span className="text-3xl font-black text-green-600">
                  ₹{totalPrice.toFixed(2)}
                </span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-2 mt-6">
                <button 
                  onClick={() => setOrderModalSeed(null)} 
                  className="flex-1 py-2 font-bold text-slate-500 hover:bg-red-100 rounded-lg transition-colors bg-red-600 text-white cursor-pointer"
                >
                  Cancel
                </button>
                
                <Link 
                  href={`/messages?userId=${orderModalSeed.owner?._id}&name=${orderModalSeed.owner?.name}`}
                  className="flex-1 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex justify-center items-center gap-1 cursor-pointer"
                >
                  💬 Message
                </Link>

                <button 
                  onClick={() => handleConfirmOrder(totalWeight)}
                  disabled={isSubmitting}
                  className="flex-[2] py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm shadow-green-200 transition-all disabled:bg-green-400 cursor-pointer"
                >
                  {isSubmitting ? 'Starting Checkout...' : `Pay & Buy for ₹${totalPrice}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}