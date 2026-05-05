'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage('✅ Login successful! Redirecting...');
        
        // Save user data to browser memory so we know they are logged in
        localStorage.setItem('krishiUser', JSON.stringify(data.user));
        
        // 🚦 THE SMART REDIRECT: Check role before routing
        setTimeout(() => {
          if (data.user.role === 'admin') {
            router.push('/admin'); // Admins go straight to Command Center
          } else {
            router.push('/dashboard'); // Regular users go to the normal dashboard
          }
        }, 1000);

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
          <h2 className="text-3xl font-extrabold text-green-600 mb-2">Welcome Back</h2>
          <p className="text-slate-500">Login to access your KrishiMitra dashboard</p>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input type="tel" name="phone" required onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="Enter registered phone" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" name="password" required onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" placeholder="••••••••" />
          </div>

          <div className="flex justify-end mt-1 mb-4">
            <Link href="/forgot-password" className="text-sm font-bold text-green-600 hover:text-green-700">
                Forgot Password?
            </Link>
            </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white p-3 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-600">
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account? <Link href="/register" className="text-green-600 font-bold hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}