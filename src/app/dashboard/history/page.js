'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const initialTab = searchParams.get('tab') === 'purchases' ? 'purchases' : 'sales';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'purchases') {
      setActiveTab('purchases');
    } else if (tabFromUrl === 'sales') {
      setActiveTab('sales');
    }
  }, [searchParams]);

  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) return router.push('/login');
    
    const parsedUser = JSON.parse(storedUser);

    setUser(parsedUser);

    fetchHistory(parsedUser.id);
  }, [router]);

  const fetchHistory = async (userId) => {
    try {
      // Fetch all 4 transaction types
      const [toolsOwner, toolsRenter, seedsSeller, seedsBuyer] = await Promise.all([
        fetch(`/api/bookings?userId=${userId}&role=owner`),
        fetch(`/api/bookings?userId=${userId}&role=renter`),
        fetch(`/api/seed-orders?sellerId=${userId}`),
        fetch(`/api/seed-orders?buyerId=${userId}`)
      ]);

      const results = await Promise.all([
        toolsOwner.json(), toolsRenter.json(), seedsSeller.json(), seedsBuyer.json()
      ]);

      let combined = [];
      
      // Merge all successful results
      results.forEach((res, index) => {
        if (res.success) {
          const type = index < 2 ? 'tool' : 'seed';
          combined = [...combined, ...res.data.map(item => ({ ...item, type }))];
        }
      });

      // Filter and Sort
      const pastItems = combined.filter(item => item.status === 'completed' || item.status === 'rejected');
      pastItems.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      
      setHistoryItems(pastItems);
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xl font-bold text-green-600">Loading your agricultural history... 🌱</div>;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.replace(`/dashboard/history?tab=${tab}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Beautiful Krishi-Mitra Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-xl bg-green-50 text-green-700 hover:bg-green-100 p-3 rounded-xl transition-colors">
            ⬅️ Back to Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Transaction History</h1>
            <p className="text-slate-500 font-medium mt-1">Your past seed sales and tool rentals</p>
          </div>
        </div>

        {/* THE TAB MENU */}
<div className="flex bg-slate-200 p-1 rounded-xl mb-8 w-full max-w-md mx-auto md:mx-0">
  <button
    onClick={() => handleTabChange('sales')}
    className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
      activeTab === 'sales' 
        ? 'bg-white text-slate-800 shadow-sm' 
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    📈 Earnings & Sales
  </button>
  <button
    onClick={() => handleTabChange('purchases')}
    className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
      activeTab === 'purchases' 
        ? 'bg-white text-slate-800 shadow-sm' 
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    🛒 My Purchases & Rentals
  </button>
</div>

        {historyItems.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-green-200 text-center">
            <div className="text-5xl mb-4">🌾</div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No history yet</h3>
            <p className="text-slate-500">When you complete or reject orders, they will appear here safely.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* SMART FILTER LOGIC */}
            {historyItems
            .filter(item => {
              const userId = String(user?.id || "");
              const buyerId = String(item.buyer?._id || item.buyer || "");
              const renterId = String(item.renter?._id || item.renter || "");
              const isPurchase = buyerId === userId || renterId === userId;
              
              if (activeTab === 'purchases') return isPurchase;
              if (activeTab === 'sales') return !isPurchase; // If they didn't buy it, they sold it
              return true;
            })
            .map((item, index) => (
              <div key={item._id || index} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                
                {/* Left Accent Bar based on status */}
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${item.status === 'completed' ? 'bg-green-500' : 'bg-red-400'}`}></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center ml-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.type === 'tool' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                        {item.type === 'tool' ? '🚜 TOOL' : '🌱 SEED'}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800">{item.type === 'tool' ? item.tool?.name : item.seed?.name}</h3>
                    </div>
                    
                    {/* Dynamic Label: Did you buy it, or did you sell it? */}
                    <p className="text-slate-600 font-medium text-sm">
                      {(String(item.buyer?._id || item.buyer || "") === String(user?.id || "") || String(item.renter?._id || item.renter || "") === String(user?.id || "")) 
                        ? <span>Purchased from: <span className="text-slate-900 font-bold">{item.owner?.name || item.seller?.name}</span></span>
                        : <span>{item.type === 'tool' ? 'Rented to:' : 'Sold to:'} <span className="text-slate-900 font-bold">{item.renter?.name || item.buyer?.name}</span></span>
                      }
                    </p>
                    
                    <p className="text-green-700 font-extrabold mt-1 text-lg">₹{item.totalPrice}</p>

                    {/* THE REVIEW BUTTON: Only show if it's completed AND the user was the buyer/renter */}
                    {item.status === 'completed' && (String(item.buyer?._id || item.buyer || "") === String(user?.id || "") || String(item.renter?._id || item.renter || "") === String(user?.id || "")) && (
                      <button 
                        onClick={() => {/* Trigger your review modal here */}}
                        className="mt-3 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 px-4 py-2 rounded-lg font-bold transition-colors"
                      >
                        ⭐ Leave a Review
                      </button>
                    )}
                  </div>

                  <div className="mt-4 md:mt-0 text-right">
                    <span className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider ${item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'}`}>
                      {item.status === 'completed' ? '✅ COMPLETED' : '❌ REJECTED'}
                    </span>
                    <p className="text-xs text-slate-400 font-medium mt-2">
                      {new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    // The fallback shows briefly while the URL is being read
    <Suspense fallback={<div className="p-4 text-center">Loading history...</div>}>
      <HistoryContent />
    </Suspense>
  );
}