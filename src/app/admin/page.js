'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navbar';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  // NEW: State to track which admin section we are viewing
  const [activeTab, setActiveTab] = useState('overview');
  const [inventory, setInventory] = useState({ tools: [], seeds: [] });
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryView, setInventoryView] = useState('tools');

  useEffect(() => {
    // Basic Security Check
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) {
      router.push('/login');
      return;
    } 
    
    const parsedUser = JSON.parse(storedUser);

    // 2. 🛡️ SECURITY CHECK: Redirect if the user is NOT an admin
    if (parsedUser.role !== 'admin') {
      alert("Unauthorized Access! Redirecting to Dashboard.");
      router.push('/dashboard'); 
      return;
    }

    // Optional: Add a check here to ensure parsedUser.role === 'admin'
    fetchAdminStats();
  }, [router]);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch admin stats", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch the farmers
  const fetchFarmers = async () => {
    setLoadingFarmers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setFarmers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch farmers", error);
    } finally {
      setLoadingFarmers(false);
    }
  };

  // Fetch farmers whenever the user clicks the "farmers" tab
  useEffect(() => {
    if (activeTab === 'farmers' && farmers.length === 0) {
      fetchFarmers();
    }
  }, [activeTab]);

  // Function to actually delete the farmer
  const handleDeleteFarmer = async (userId, userName) => {
    const isConfirmed = window.confirm(`Are you absolutely sure you want to delete ${userName}? This cannot be undone.`);
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        // Remove the deleted user from the screen instantly
        setFarmers(farmers.filter(farmer => farmer._id !== userId));
        alert('Farmer deleted successfully.');
      } else {
        alert(data.message || 'Failed to delete user.');
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Something went wrong while deleting.");
    }
  };

  // Fetch Inventory
  const fetchInventory = async () => {
    setLoadingInventory(true);
    try {
      const res = await fetch('/api/admin/inventory');
      const data = await res.json();
      if (data.success) {
        setInventory(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Fetch when tab is clicked
  useEffect(() => {
    if (activeTab === 'inventory' && inventory.tools.length === 0 && inventory.seeds.length === 0) {
      fetchInventory();
    }
  }, [activeTab]);

  // Delete Item
  const handleDeleteItem = async (itemId, type, itemName) => {
    const isConfirmed = window.confirm(`Are you sure you want to remove "${itemName}" from the platform?`);
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/inventory?id=${itemId}&type=${type}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        // Update the UI instantly
        if (type === 'tool') {
          setInventory({ ...inventory, tools: inventory.tools.filter(t => t._id !== itemId) });
        } else {
          setInventory({ ...inventory, seeds: inventory.seeds.filter(s => s._id !== itemId) });
        }
        alert('Item removed successfully.');
      } else {
        alert(data.message || 'Failed to delete item.');
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Something went wrong while deleting.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-bold">Loading Command Center...</div>;
  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              👑 Krishi Mitra Admin
            </h1>
            <p className="text-slate-500 mt-1">Platform overview and economy statistics.</p>
          </div>

          {/* NEW: Admin Navigation Tabs */}
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              📊 Overview
            </button>
            <button 
              onClick={() => setActiveTab('farmers')} 
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'farmers' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              👥 Manage Farmers
            </button>
            <button 
              onClick={() => setActiveTab('inventory')} 
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'inventory' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              📦 Manage Inventory
            </button>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* TAB 1: PLATFORM OVERVIEW (Your Existing Code)    */}
        {/* ------------------------------------------------ */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <MetricCard title="Total Farmers" value={stats.totalUsers} icon="👨‍🌾" color="bg-blue-100 text-blue-700" />
              <MetricCard title="Tools Listed" value={stats.totalTools} icon="🚜" color="bg-green-100 text-green-700" />
              <MetricCard title="Seed Listings" value={stats.totalSeeds} icon="🌱" color="bg-orange-100 text-orange-700" />
              <MetricCard title="Platform Economy" value={`₹${stats.totalEconomy.toLocaleString()}`} icon="📈" color="bg-purple-100 text-purple-700" />
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">⚡ Recent Platform Activity</h2>
              
              {stats.recentActivity.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No recent activity.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-sm">
                        <th className="pb-3 font-medium">Tool</th>
                        <th className="pb-3 font-medium">Renter</th>
                        <th className="pb-3 font-medium">Owner</th>
                        <th className="pb-3 font-medium">Value</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.recentActivity.map((activity) => (
                        <tr key={activity._id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-bold text-slate-900">{activity.tool?.name || activity.seed?.name || 'Deleted item'}</td>
                          <td className="py-4 text-slate-600">{activity.renter?.name || 'Unknown'}</td>
                          <td className="py-4 text-slate-600">{activity.owner?.name || 'Unknown'}</td>
                          <td className="py-4 font-bold text-green-600">₹{activity.totalPrice}</td>
                          <td className="py-4">
                            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                              activity.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              activity.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {activity.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* ------------------------------------------------ */}
        {/* TAB 2: MANAGE FARMERS (Users)                    */}
        {/* ------------------------------------------------ */}
        {activeTab === 'farmers' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Farmer Database</h2>
                <p className="text-slate-500 mt-1">View or remove users from the KrishiMitra platform.</p>
              </div>
              <button onClick={fetchFarmers} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors text-sm">
                🔄 Refresh
              </button>
            </div>

            {loadingFarmers ? (
              <div className="text-center py-10 text-slate-500 font-bold">Loading farmers...</div>
            ) : farmers.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No farmers found in the database.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <th className="p-4 font-bold">Name</th>
                      <th className="p-4 font-bold">Phone / Contact</th>
                      <th className="p-4 font-bold">Village / Location</th>
                      <th className="p-4 font-bold">Joined</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {farmers.map((farmer) => (
                      <tr key={farmer._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {farmer.name.charAt(0).toUpperCase()}
                          </div>
                          {farmer.name}
                        </td>
                        <td className="p-4 text-slate-600">{farmer.phone || farmer.email || 'N/A'}</td>
                        <td className="p-4 text-slate-600">{farmer.villageName || 'Unknown'}</td>
                        <td className="p-4 text-slate-500 text-sm">
                          {new Date(farmer.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteFarmer(farmer._id, farmer.name)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* TAB 3: MANAGE INVENTORY (Tools & Seeds)          */}
        {/* ------------------------------------------------ */}
        {activeTab === 'inventory' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Platform Inventory</h2>
                <p className="text-slate-500 mt-1">Review or moderate items listed by farmers.</p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Toggle Buttons */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setInventoryView('tools')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${inventoryView === 'tools' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    🚜 Tools
                  </button>
                  <button 
                    onClick={() => setInventoryView('seeds')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${inventoryView === 'seeds' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    🌱 Seeds
                  </button>
                </div>
                
                <button onClick={fetchInventory} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-lg font-bold transition-colors text-sm">
                  🔄 Refresh
                </button>
              </div>
            </div>

            {loadingInventory ? (
              <div className="text-center py-10 text-slate-500 font-bold">Loading inventory...</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <th className="p-4 font-bold">Item Name</th>
                      <th className="p-4 font-bold">Owner</th>
                      <th className="p-4 font-bold">Price</th>
                      <th className="p-4 font-bold">Location</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryView === 'tools' && inventory.tools.length === 0 && (
                      <tr><td colSpan="5" className="text-center py-8 text-slate-500">No tools listed yet.</td></tr>
                    )}
                    {inventoryView === 'seeds' && inventory.seeds.length === 0 && (
                      <tr><td colSpan="5" className="text-center py-8 text-slate-500">No seeds listed yet.</td></tr>
                    )}

                    {(inventoryView === 'tools' ? inventory.tools : inventory.seeds).map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{item.name}</td>
                        <td className="p-4 text-slate-600">{item.owner?.name || 'Unknown'}</td>
                        <td className="p-4 font-bold text-green-600">
                          ₹{inventoryView === 'tools' 
                            ? (item.pricePerHour || '0') 
                            : (item.price || '0')
                          }
                          {/* Update the unit to match your pricePerHour model */}
                          {inventoryView === 'tools' ? ' / hour' : ' / kg'}
                        </td>
                        <td className="p-4 text-slate-600">
                          {item.location && typeof item.location === 'object' ? (
                            /* If it's a GeoJSON object, extract the coordinates */
                            <span className="flex items-center gap-1 text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                              📍 {item.location.coordinates[1].toFixed(2)}, {item.location.coordinates[0].toFixed(2)}
                            </span>
                          ) : (
                            /* If it's a string or missing, show as is */
                            item.location || <span className="text-slate-400 italic">No Location</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteItem(item._id, inventoryView === 'tools' ? 'tool' : 'seed', item.name)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  );
}