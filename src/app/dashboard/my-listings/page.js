'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MyListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Verify User & Trigger Fetch
  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) {
      return router.push('/login');
    }
    const parsedUser = JSON.parse(storedUser);
    fetchMyListings(parsedUser.id);
  }, [router]);

  // 2. Fetch Tools & Seeds from MongoDB
  const fetchMyListings = async (userId) => {
    try {
      const [toolsRes, seedsRes] = await Promise.all([
        fetch(`/api/tools?ownerId=${userId}`),
        fetch(`/api/seeds?sellerId=${userId}`)
      ]);

      const toolsData = await toolsRes.json();
      const seedsData = await seedsRes.json();

      let combinedListings = [];
      
      if (toolsData.success && toolsData.data) {
        const tools = toolsData.data.map(t => ({
          id: t._id,
          title: t.name || t.title,
          type: 'tool',
          status: t.isAvailable !== false ? 'Active' : 'Unavailable'
        }));
        combinedListings = [...combinedListings, ...tools];
      }

      if (seedsData.success && seedsData.data) {
        const seeds = seedsData.data.map(s => ({
          id: s._id,
          title: s.name || s.title,
          type: 'seed',
          status: s.isAvailable !== false ? 'Active' : 'Out of Stock'
        }));
        combinedListings = [...combinedListings, ...seeds];
      }

      setListings(combinedListings);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Delist (Delete) Item from MongoDB
  const handleDelist = async (id, type) => {
    const confirmDelete = window.confirm("Are you sure you want to completely delist this item from the KrishiMitra marketplace?");
    if (!confirmDelete) return;

    try {
      const endpoint = type === 'tool' ? `/api/tools?id=${id}` : `/api/seeds?id=${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setListings(listings.filter(item => item.id !== id));
      } else {
        alert(data.message || "Failed to delete from database.");
      }
    } catch (error) {
      console.error("Error delisting item:", error);
      alert("A network error occurred. Please try again.");
    }
  };

  // 4. Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="text-5xl animate-bounce mb-4">🚜</div>
        <div className="text-xl font-bold text-green-600">Loading your listings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-xl bg-green-50 text-green-700 hover:bg-green-100 p-3 rounded-xl transition-colors">
            ⬅️ Back to Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">My Active Listings</h1>
            <p className="text-slate-500 font-medium mt-1">Manage your currently listed tools and seeds</p>
          </div>
        </div>

        {/* Empty State */}
        {listings.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-green-200 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No active listings</h3>
            <p className="text-slate-500 mb-6">You are not sharing any tools or seeds right now.</p>
            <div className="flex justify-center gap-4">
              <Link href="/dashboard/add-tool" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm">
                List a Tool
              </Link>
              <Link href="/dashboard/add-seed" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-sm">
                List Seeds
              </Link>
            </div>
          </div>
        ) : (
          /* Listed Items Grid */
          <div className="space-y-4">
            {listings.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-green-500"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center ml-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${item.type === 'tool' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                        {item.type === 'tool' ? '🚜 TOOL' : '🌱 SEED'}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                    </div>
                    <p className="text-slate-600 font-medium mt-1">
                      Status: <span className="text-green-700 font-extrabold uppercase tracking-wider text-sm">✅ {item.status}</span>
                    </p>
                  </div>

                  <div className="mt-4 md:mt-0 text-right">
                    <button 
                      onClick={() => handleDelist(item.id, item.type)}
                      className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all"
                    >
                      Delist Item
                    </button>
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