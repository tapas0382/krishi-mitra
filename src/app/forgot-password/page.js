'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      // Connect to our new API route
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      // Show the success message regardless of outcome (security best practice)
      setStatus('sent');
    } catch (error) {
      console.error(error);
      setStatus(''); // Let them try again if the server crashed
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Reset Password</h1>
        <p className="text-slate-500 mb-6">Enter your email address and we will help you get back into your account.</p>

        {status === 'sent' ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 font-medium">
            If an account exists for {email}, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <input 
                type="email" 
                required
                placeholder="farmer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:bg-green-400"
            >
              {status === 'loading' ? 'Checking...' : 'Send Reset Link'}
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