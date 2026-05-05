import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-slate-950 py-8 text-center text-slate-500 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
        
        {/* Brand / Copyright */}
        <div className="mb-4 md:mb-0 text-center md:text-left">
          <h2 className="text-xl font-bold text-green-500 mb-1">KrishiMitra</h2>
          <p className="text-sm">© {new Date().getFullYear()} KrishiMitra. All rights reserved.</p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center space-x-4 md:space-x-6 text-sm">
          <Link href="/about" className="hover:text-green-400 transition-colors">About Us</Link>
          <Link href="/contact" className="hover:text-green-400 transition-colors">Contact</Link>
          <Link href="/privacy" className="hover:text-green-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-green-400 transition-colors">Terms of Service</Link>
        </div>

      </div>
    </footer>
  );
};

export default Footer;