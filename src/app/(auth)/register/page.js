'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'farmer',
    villageName: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // 👇 Added quick frontend validation
    if (formData.phone.length < 10) {
      setLoading(false);
      return setMessage('❌ Phone number must be at least 10 digits.');
    }
    if (!formData.email.includes('@')) {
      setLoading(false);
      return setMessage('❌ Please enter a valid email address.');
    }
    if (formData.password.length < 6) {
      setLoading(false);
      return setMessage('❌ Password must be at least 6 characters.');
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage('✅ Account created! Redirecting to login...');
        // In the next step, we will automatically redirect them to login
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (error) {
      setMessage('❌ Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
        
        {/* 👇 NEW: Back Button */}
        <button 
          onClick={() => router.back()}
          type="button"
          className="flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-colors mb-6 font-bold text-sm cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-green-600 mb-2">🌾 KrishiMitra</h2>
          <p className="text-slate-500">Join your local farming community</p>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input type="text" name="name" required onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="Enter your full name (e.g., Ramesh Kumar)" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input type="tel" name="phone" required onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="e.g., 9876543210" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" name="email" required onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="farmer@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Village / City Name</label>
            <input type="text" name="villageName" required onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="Enter your village" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">I want to...</label>
            <select name="role" onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
              <option value="farmer">Share & Rent Tools (Farmer)</option>
              <option value="buyer">Buy Crops (Buyer/Hotel)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" name="password" required onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:bg-green-400">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <Link href="/login" className="text-green-600 font-bold hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
}