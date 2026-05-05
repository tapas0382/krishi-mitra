'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../components/navbar'; // Adjust path if your navbar is elsewhere
import Footer from '@/components/footer';

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 👈 3. CHECK FOR THE USER IN LOCALSTORAGE
    const storedUser = localStorage.getItem('krishiUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user", error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-200">
      <Navbar />

      {/* 1. HERO SECTION */}
      {/* 👇 NEW: min-h-[calc(100vh-5rem)] makes it fill the screen, flex items-center centers it vertically */}
      <section className="relative min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-5rem)] flex items-center overflow-hidden py-12 lg:py-0">
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 bg-green-400 blur-[120px] rounded-full pointer-events-none"></div>
        
        {/* 👇 NEW: Added w-full so it spans the width correctly inside the flex container */}
        <div className="max-w-7xl mx-auto px-4 relative z-10 w-full">
          
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            
            {/* 👈 LEFT SIDE: Text Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 font-bold text-sm tracking-wide mt-8 lg:mt-0">
                🌱 The #1 Farmer-to-Farmer Network
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
                Share Tools. <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">Grow Together.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Krishi Mitra connects local farmers to rent heavy machinery, exchange indigenous seeds, and get AI-powered weather advice. Stop buying expensive equipment—rent it from your neighbors.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <Link href="/tools" className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-green-600/30 hover:-translate-y-1">
                  Find Tools Nearby 🚜
                </Link>
                <Link 
                  href={user ? "/dashboard" : "/register"} 
                  className="bg-white text-slate-800 border border-slate-200 px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {user ? (
                    <>Go to Dashboard 🚜</>
                  ) : (
                    <>Join the Community 🌱</>
                  )}
                </Link>
              </div>
            </div>

            {/* 👉 RIGHT SIDE: Image Container */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none relative mx-auto mt-4 lg:mt-0">
              {/* Decorative background shape */}
              <div className="absolute inset-0 bg-gradient-to-tr from-green-200 to-emerald-100 rounded-[2rem] rotate-3 scale-105 -z-10"></div>
              
              <Image 
                src="/farmer-1.jpg" 
                alt="Krishi Mitra Farmer"
                width={600}
                height={400}
                className="rounded-[2rem] shadow-2xl border-4 border-white object-cover w-full h-[300px] sm:h-[400px] lg:h-[450px]"
                priority
              />
            </div>

          </div>
        </div>
      </section>

      {/* 2. FEATURES GRID */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Everything you need to farm smarter</h2>
            <p className="text-slate-500">Built by farmers, for farmers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="🚜"
              title="Peer-to-Peer Rentals"
              desc="Don't let your tractor gather dust. List it on Krishi Mitra and earn money when you aren't using it. Rent equipment only when you need it."
            />
            <FeatureCard 
              icon="✨"
              title="AI Krishi Mitra"
              desc="Our built-in AI checks the live satellite weather over your exact village and tells you exactly what to plant and which tools to use today."
            />
            <FeatureCard 
              icon="🌱"
              title="Seed Exchange Network"
              desc="Preserve biodiversity. Swap rare and indigenous seeds with other local farmers to ensure high-quality yields year after year."
            />
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold mb-16">How Krishi Mitra Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Step number="1" title="Register" desc="Sign up and pin your village location." />
            <Step number="2" title="Search" desc="Find tools or seeds within a 50km radius." />
            <Step number="3" title="Book & Chat" desc="Reserve the tool and message the owner instantly." />
            <Step number="4" title="Return & Review" desc="Finish the job and leave a star rating to build trust." />
          </div>

          <div className="mt-20">
            <Link href="/dashboard" className="bg-green-500 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-400 transition-colors inline-block">
              Go to Your Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* Section 4: Help & Support */}
<div className="max-w-6xl mx-auto my-20 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
  <div className="flex flex-col md:flex-row">
    
    {/* Left Side: Brand & Contact Info */}
    <div className="bg-slate-900 p-10 md:p-12 text-white md:w-2/5 flex flex-col justify-between">
      <div>
        <h2 className="text-3xl font-extrabold mb-4">Get in Touch</h2>
        <p className="text-slate-400 mb-10 leading-relaxed">
          Have questions about KrishiMitra? Whether you're renting tools or buying seeds, our support team is here to help you grow.
        </p>
        
        <div className="space-y-8">
          <div className="flex items-center gap-5">
            <div className="bg-slate-800/80 p-4 rounded-2xl text-2xl border border-slate-700">📧</div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Email Support</p>
              <p className="font-medium text-lg">support@krishimitra.com</p>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="bg-slate-800/80 p-4 rounded-2xl text-2xl border border-slate-700">📞</div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Call Helpline</p>
              <p className="font-medium text-lg">+91 98765 43210</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-slate-800">
        <p className="text-sm text-slate-500 italic font-medium">"Empowering Farmers, One Connection at a Time."</p>
      </div>
    </div>

    {/* Right Side: Visual Form Elements */}
    <div className="p-10 md:p-12 md:w-3/5 bg-slate-50">
      <h3 className="text-2xl font-bold text-slate-800 mb-8">Send us a Message</h3>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Full Name</label>
            <input 
              type="text" 
              placeholder="Rahul Kumar" 
              className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-300" 
            />
          </div>
          
          {/* Phone Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Phone Number</label>
            <input 
              type="tel" 
              placeholder="+91 00000 00000" 
              className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-300" 
            />
          </div>
        </div>

        {/* Subject Select */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">How can we help?</label>
          <select className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-slate-600 appearance-none">
            <option>I need help with a tool rental</option>
            <option>I have a question about seed orders</option>
            <option>Technical support for my account</option>
            <option>Other inquiries</option>
          </select>
        </div>

        {/* Message Textarea */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Your Message</label>
          <textarea 
            rows="4" 
            placeholder="Briefly describe what you need help with..." 
            className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none resize-none transition-all placeholder:text-slate-300"
          ></textarea>
        </div>

        {/* Static Button */}
        <button 
          type="button" 
          className="w-full md:w-auto mt-2 bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-green-200/50 flex items-center justify-center gap-2"
        >
          Send Message <span>🚀</span>
        </button>
      </div>
    </div>
  </div>
</div>
      
      {/* 5. FOOTER */}
      {/* <footer className="bg-slate-950 py-8 text-center text-slate-500 border-t border-slate-800">
        <p className="font-medium text-lg text-slate-400 mb-2">🌾 Krishi Mitra</p>
        <p className="text-sm">Empowering agricultural communities through technology.</p>
      </footer> */}
      <Footer />
    </div>
  );
}

// Helper Components for clean code
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-green-200 transition-colors group">
      <div className="text-5xl mb-6 group-hover:scale-110 transition-transform origin-left">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-2xl font-bold text-green-400 mb-6">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed max-w-[200px]">{desc}</p>
    </div>
  );
}