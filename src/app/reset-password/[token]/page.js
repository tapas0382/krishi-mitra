'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const token = unwrappedParams.token; // Grabs the secret token directly from the URL
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (password !== confirmPassword) {
      return setMessage('❌ Passwords do not match.');
    }
    if (password.length < 6) {
      return setMessage('❌ Password must be at least 6 characters.');
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
        setMessage('✅ Password updated successfully! Redirecting...');
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (error) {
      setMessage('❌ Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Create New Password</h1>
        <p className="text-slate-500 mb-6">Enter your new secure password below.</p>

        {message && (
          <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        {!isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 mt-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:bg-green-400"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-slate-500 font-bold hover:text-slate-700">
            ⬅️ Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}