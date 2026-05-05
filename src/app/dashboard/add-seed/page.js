'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/navbar';

export default function AddSeed() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Replace with your actual Cloudinary Cloud Name!
  const CLOUD_NAME = "dlaahgvgx"; 
  const UPLOAD_PRESET = "krishi_tools"; // You can use the same preset

  const [formData, setFormData] = useState({
    name: '',
    type: 'offer',
    quantity: '',
    price: 0,
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
          alert("📍 Seed location captured!");
        },
        () => alert("❌ Please allow location access.")
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.latitude) return setMessage('❌ Please click "Get My Location" first');
    
    setLoading(true);
    setMessage('Processing...');

    try {
      let imageUrl = "";

      // 1. Upload Image to Cloudinary if selected
      if (formData.image) {
        setMessage('Uploading image...');
        const imageFormData = new FormData();
        imageFormData.append('file', formData.image);
        imageFormData.append('upload_preset', UPLOAD_PRESET);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: imageFormData,
        });
        const cloudinaryData = await cloudinaryRes.json();
        imageUrl = cloudinaryData.secure_url;
      }

      setMessage('Saving listing...');

      // 2. Save to Backend
      const res = await fetch('/api/seeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          quantity: formData.quantity,
          price: Number(formData.price),
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
        setMessage('✅ Seed listed successfully!');
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
          <h1 className="text-2xl font-bold text-slate-900 mb-6">List Seeds</h1>

          {message && (
            <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Are you offering or looking for seeds?</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, type: 'offer'})} 
                  className={`p-3 rounded-lg border font-bold transition flex flex-col items-center justify-center gap-1 ${formData.type === 'offer' ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-lg">🌱</span> I have Seeds to Offer
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, type: 'request'})} 
                  className={`p-3 rounded-lg border font-bold transition flex flex-col items-center justify-center gap-1 ${formData.type === 'request' ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="text-lg">🔍</span> I am Looking for Seeds
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Seed Variety / Name</label>
              <input type="text" name="name" required onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="e.g. Swarna Rice, Organic Wheat" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input type="text" name="quantity" required onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="e.g. 10 kg, 2 packets" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹) <span className="text-xs font-normal text-slate-400">(0 for Free)</span></label>
                <input type="number" name="price" required onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="0" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full p-2 border border-slate-300 text-slate-900 rounded-lg bg-slate-50 cursor-pointer" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Description</label>
              <textarea name="description" rows="3" onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="Mention if they are organic, hybrid, or home-grown." />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">Location Setup</label>
              <button type="button" onClick={getLocation} className="w-full bg-slate-200 text-slate-700 p-3 rounded-lg font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                📍 Get My Location
              </button>
              {formData.latitude && <p className="text-green-600 text-xs mt-2 text-center font-bold">Location captured successfully!</p>}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-4 rounded-lg font-bold hover:bg-green-700 transition-all shadow-lg active:scale-[0.98]">
              {loading ? 'Processing...' : 'Post Seed Listing'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}