'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/navbar';

export default function AddTool() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Cloudinary Details - Replace with your actual Cloud Name!
  const CLOUD_NAME = "dlaahgvgx"; 
  const UPLOAD_PRESET = "krishi_tools"; 

  const [formData, setFormData] = useState({
    name: '',
    category: 'Tractor',
    pricePerHour: '',
    description: '',
    image: null,
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) router.push('/login');
    else setUser(JSON.parse(storedUser));
  }, [router]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({ 
            ...formData, 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude 
          });
          alert("📍 Location captured successfully!");
        },
        () => alert("❌ Please allow location access to list a tool.")
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) return setMessage('❌ Please select an image');
    if (!formData.latitude || !formData.longitude) return setMessage('❌ Please click "Get My Location" first');
    
    setLoading(true);
    setMessage('Uploading image...');

    try {
      // 1. Upload Image directly to Cloudinary
      const imageFormData = new FormData();
      imageFormData.append('file', formData.image);
      imageFormData.append('upload_preset', UPLOAD_PRESET);

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: imageFormData,
      });
      const cloudinaryData = await cloudinaryRes.json();
      const imageUrl = cloudinaryData.secure_url;

      setMessage('Saving tool details...');

      // 2. Save everything to your Next.js Backend
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          pricePerHour: Number(formData.pricePerHour),
          description: formData.description,
          imageUrl: imageUrl,
          latitude: formData.latitude,
          longitude: formData.longitude,
          ownerId: user.id,
          villageName: user.villageName,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage('✅ Tool listed successfully!');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (error) {
      setMessage('❌ Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">List a New Tool</h1>

          {message && (
            <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tool Name</label>
              <input type="text" name="name" required onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="e.g. Mahindra Tractor 35HP" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select name="category" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                  <option value="Tractor">Tractor</option>
                  <option value="Harvester">Harvester</option>
                  <option value="Water Pump">Water Pump</option>
                  <option value="Hand Tool">Hand Tool</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price per Hour (₹)</label>
                <input type="number" name="pricePerHour" required onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="e.g. 500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tool Photo</label>
              <input type="file" accept="image/*" required onChange={handleFileChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all cursor-pointer" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea name="description" rows="3" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="Any details about condition, fuel, etc." />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">Location Setup</label>
              <p className="text-xs text-slate-500 mb-3">We need your exact location to show this tool to nearby farmers.</p>
              <button type="button" onClick={getLocation} className="w-full bg-slate-200 text-slate-700 p-3 rounded-lg font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                📍 Get My Location
              </button>
              {formData.latitude && <p className="text-green-600 text-xs mt-2 text-center font-bold">Location captured successfully!</p>}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-4 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:bg-slate-400">
              {loading ? 'Processing...' : 'List Tool Now'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}