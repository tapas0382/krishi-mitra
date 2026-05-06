'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/navbar';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [myRentals, setMyRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seedOrders, setSeedOrders] = useState([]);
  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRentalsExpanded, setIsRentalsExpanded] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    // 1. Initial Load: Fetch everything immediately (shows loading spinner)
    fetchAllDashboardData(parsedUser.id, false);

    // 2. The Auto-Refresh Timer: Check for new requests every 5 seconds (silently)
    const intervalId = setInterval(() => {
      fetchAllDashboardData(parsedUser.id, true); 
    }, 10000);

    // 3. Cleanup: Stop the timer if the user navigates away
    return () => clearInterval(intervalId);
  }, [router]);

  const fetchAllDashboardData = async (userId, isSilent = false) => {
    if (!isSilent) setLoading(true);

    try {
      // 1. Fetch Incoming Tool Requests (For Action Center)
      const incomingRes = await fetch(`/api/bookings?userId=${userId}&role=owner`);
      const incomingData = await incomingRes.json();
      if (incomingData.success) setIncomingRequests(incomingData.data);

      // 2. Fetch My Tool Rentals (Outgoing Tools)
      const outgoingRes = await fetch(`/api/bookings?userId=${userId}&role=renter`);
      const outgoingData = await outgoingRes.json();

      // 3. Fetch Incoming Seed Orders (For Action Center)
      const seedRes = await fetch(`/api/seed-orders?sellerId=${userId}`);
      const seedData = await seedRes.json();
      if (seedData.success) setSeedOrders(seedData.data);

      // 4. NEW: Fetch My Seed Purchases (Outgoing Seeds)
      // *Note: Assuming your API uses 'buyerId'. If your database uses a different 
      // name like 'userId' or 'renterId' for the seed buyer, just change 'buyerId' below!
      const boughtSeedRes = await fetch(`/api/seed-orders?buyerId=${userId}`);
      const boughtSeedData = await boughtSeedRes.json();

      // 5. MERGE rented tools and bought seeds together, then save to state!
      const rentedTools = outgoingData.success ? outgoingData.data : [];
      const boughtSeeds = boughtSeedData.success ? boughtSeedData.data : [];
      
      setMyRentals([...rentedTools, ...boughtSeeds]);

    } catch (error) {
      console.error("Error fetching dashboard data", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Handle Approve / Reject
  const handleOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch('/api/seed-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        // Update the UI instantly
        setSeedOrders(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        ));
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAllDashboardData(user.id);
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewBooking._id,
          itemType: reviewBooking.type,
          reviewerId: user.id,
          rating: Number(rating),
          comment: reviewComment
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert("✅ Review submitted successfully!");
        setReviewBooking(null); // Close modal
        setReviewComment('');
        setRating(5);
      } else {
        alert("❌ " + data.message);
      }
    } catch (error) {
      alert("Something went wrong!");
    } finally {
      setReviewLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome, {user.name}! 🌾</h1>
            <p className="text-slate-500 mt-2">Manage your tools, seeds, and rentals from here.</p>
            <p className="inline-block mt-3 bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
              📍 {user.villageName}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">

          <Link 
            href="/dashboard/my-listings" 
            className="bg-white border-2 border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 shadow-sm"
          >
            📦 My Listings
          </Link>

            <Link href="/dashboard/add-tool" className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2">
              <span>+</span> Add Tool
            </Link>
            <Link href="/dashboard/add-seed" className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
              <span>🌱</span> List Seed
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading your dashboard...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Section 1: Unified Action Center (Pending & Active Only) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  📥 Action Center
                  <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full">
                    {incomingRequests?.filter(r => r.status === 'pending' || r.status === 'accepted').length + 
                     seedOrders?.filter(o => o.status === 'pending' || o.status === 'accepted').length}
                  </span>
                </h2>
                <Link href="/dashboard/history" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-lg">
                  History 🕰️
                </Link>
              </div>
              
              {/* Combine and filter the lists */}
              {(() => {
                const activeTools = (incomingRequests || [])
                  .filter(r => {
                    if (r.status === 'accepted') return true;
                    if (r.status === 'pending') return r.paymentStatus === 'held';
                    return false;
                  })
                  .map(r => ({ ...r, type: 'tool' }));
                const activeSeeds = (seedOrders || [])
                  .filter(o => {
                    if (o.status === 'accepted') return true;
                    if (o.status === 'pending') return o.paymentStatus === 'held';
                    return false;
                  })
                  .map(o => ({ ...o, type: 'seed' }));
                const combinedActive = [...activeTools, ...activeSeeds];
                
                if (combinedActive.length === 0) {
                  return (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-slate-500">No pending tasks right now. You're all caught up!</p>
                    </div>
                  );
                }

                // Determine how many to show
                const displayedItems = isExpanded ? combinedActive : combinedActive.slice(0, 3);

                return (
                  <div className="space-y-4">
                    {displayedItems.map((item, index) => (
                      <div key={item._id || index} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative overflow-hidden">
                        
                        {/* Dynamic Tag */}
                        <div className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl ${item.type === 'tool' ? 'bg-blue-100 text-blue-800' : 'bg-green-200 text-green-900'}`}>
                          {item.type === 'tool' ? '🚜 TOOL RENTAL' : '🌱 SEED ORDER'}
                        </div>
                        
                        <div className="flex justify-between items-start mb-2 mt-2">
                          <h3 className="font-bold text-slate-900">{item.type === 'tool' ? item.tool?.name : item.seed?.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.status}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-600">
                          <strong>{item.type === 'tool' ? 'Renter:' : 'Buyer:'}</strong> {item.type === 'tool' ? item.renter?.name : item.buyer?.name}
                        </p>
                        <p className="text-green-600 font-bold mt-2">Earnings: ₹{item.totalPrice}</p>
                        {(item.type === 'tool' || item.type === 'seed') && (
                          <p className="text-xs text-slate-500 mt-1">
                            Payment: <span className="font-semibold uppercase">{item.paymentStatus || 'unpaid'}</span>
                          </p>
                        )}
                        
                        {/* Action Buttons */}
                        {item.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <button onClick={() => item.type === 'tool' ? handleUpdateStatus(item._id, 'accepted') : handleOrderStatus(item._id, 'accepted')} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700">Accept</button>
                            <button onClick={() => item.type === 'tool' ? handleUpdateStatus(item._id, 'rejected') : handleOrderStatus(item._id, 'rejected')} className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-medium hover:bg-red-200">Reject</button>
                          </div>
                        )}

                        {item.status === 'accepted' && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <button onClick={() => item.type === 'tool' ? handleUpdateStatus(item._id, 'completed') : handleOrderStatus(item._id, 'completed')} className="w-full bg-slate-800 text-white py-2 rounded-lg font-medium hover:bg-slate-900 transition-colors">
                              ✅ Mark as Completed
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Expand Button */}
                    {combinedActive.length > 3 && (
                      <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full py-3 mt-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        {isExpanded ? 'Show Less ⬆️' : `View All ${combinedActive.length} Requests ⬇️`}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Section 2: My Rentals & Purchases (Renter View) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  🛒 My Rentals & Orders
                  {/* Dynamic Count Badge */}
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                    {myRentals?.length || 0}
                  </span>
                </h2>
                <Link 
                  href="/dashboard/history?tab=purchases" 
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-lg"
                >
                  History 🕰️
                </Link>
              </div>
              
              {(() => {
                // 1. We ONLY use myRentals. We map through it and tag it as 'tool' or 'seed' automatically!
                const combinedOrders = (myRentals || [])
                  // 1. Filter out completed/rejected items (make them vanish!)
                  .filter(req => req.status !== 'completed' && req.status !== 'rejected')
                  // 2. Map the type
                  .map(req => ({
                    ...req,
                    type: req.tool ? 'tool' : 'seed'
                  }));
                
                // 2. Empty State
                if (combinedOrders.length === 0) {
                  return (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-slate-500 mb-4">You haven't rented any tools or bought seeds yet.</p>
                      <div className="flex justify-center gap-4">
                        <Link href="/tools" className="text-blue-600 font-bold hover:underline">🚜 Find tools</Link>
                        <Link href="/seeds" className="text-green-600 font-bold hover:underline">🌱 Find seeds</Link>
                      </div>
                    </div>
                  );
                }

                // 3. Slice the array to show only 3 by default
                const displayedItems = isRentalsExpanded ? combinedOrders : combinedOrders.slice(0, 3);

                return (
                  <div className="space-y-4">
                    {displayedItems.map((item, index) => {
                      // Point to the actual item data based on the type we assigned above
                      const actualItem = item.type === 'tool' ? item.tool : item.seed;
                      
                      // Safety catch just in case the database sends a broken record
                      if (!actualItem) return null;

                      return (
                        <div key={item._id || index} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex gap-4 relative overflow-hidden">
                          
                          {/* Dynamic Tag */}
                          <div className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl ${item.type === 'tool' ? 'bg-blue-100 text-blue-800' : 'bg-green-200 text-green-900'}`}>
                            {item.type === 'tool' ? '🚜 TOOL' : '🌱 SEED'}
                          </div>

                          {/* Dynamic Image */}
                          <img src={actualItem.imageUrl || actualItem.images?.[0]} alt={actualItem.name} className="w-20 h-20 object-cover rounded-lg" />
                          
                          <div className="flex-1 mt-2 md:mt-0">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-slate-900">{actualItem.name}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.status}
                              </span>
                            </div>
                            
                            <p className="text-sm text-slate-600 mt-1"><strong>Owner:</strong> {item.owner?.name} ({item.owner?.phone})</p>
                            
                            {/* Show Hours for Tools, Show Quantity/Date for Seeds */}
                            {item.type === 'tool' ? (
                              <p className="text-sm text-slate-600"><strong>Date:</strong> {new Date(item.startDate).toLocaleDateString()} for {item.hoursRequested} hours</p>
                            ) : (
                              <p className="text-sm text-slate-600"><strong>Ordered:</strong> {new Date(item.createdAt).toLocaleDateString()} (Qty: {item.quantityKg || 1} kg)</p>
                            )}
                            
                            <p className="text-slate-900 font-bold mt-1">Cost: ₹{item.totalPrice}</p>
                            {item.type === 'tool' && (
                              <p className="text-xs text-slate-500 mt-1">
                                Payment: <span className="font-semibold uppercase">{item.paymentStatus || 'unpaid'}</span>
                              </p>
                            )}

                            {/* Review Button for completed tools
                            {item.status === 'completed' && (
                              <button 
                                onClick={() => setReviewBooking(item)}
                                className="mt-3 text-sm bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1.5 rounded font-bold transition-colors"
                              >
                                ⭐ Leave a Review
                              </button>
                            )} */}
                          </div>
                        </div>
                      );
                    })}

                    {/* The View All Button */}
                    {combinedOrders.length > 3 && (
                      <button 
                        onClick={() => setIsRentalsExpanded(!isRentalsExpanded)}
                        className="w-full py-3 mt-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        {isRentalsExpanded ? 'Show Less ⬆️' : `View All ${combinedOrders.length} Orders ⬇️`}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Review Modal Popup */}
{reviewBooking && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-slate-900">Rate your experience</h2>
        <button onClick={() => setReviewBooking(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
      </div>
      
      <p className="text-sm text-slate-600 mb-6">
        {/* FIX: Smart check for tool OR seed name */}
        How was the <strong>{(reviewBooking.tool || reviewBooking.seed)?.name}</strong> from {reviewBooking.owner?.name}?
      </p>

      <form onSubmit={submitReview} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Rating (1 to 5 Stars)</label>
          <select 
            value={rating} 
            onChange={(e) => setRating(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400 bg-slate-50"
          >
            <option value="5">⭐⭐⭐⭐⭐ (5) - Excellent</option>
            <option value="4">⭐⭐⭐⭐ (4) - Very Good</option>
            <option value="3">⭐⭐⭐ (3) - Average</option>
            <option value="2">⭐⭐ (2) - Poor</option>
            <option value="1">⭐ (1) - Terrible</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Your Feedback</label>
          <textarea 
            required 
            rows="3"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Was the item in good condition? Was the owner helpful?"
            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <button 
          type="submit" 
          disabled={reviewLoading}
          className="w-full bg-slate-900 text-white p-3 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-400 mt-2"
        >
          {reviewLoading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  </div>
)}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800"
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${styles[status] || 'bg-slate-100'}`}>
      {status}
    </span>
  );
}