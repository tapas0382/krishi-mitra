'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname(); 
  
  // 👑 ADMIN CHECK: Are we in the Command Center?
  const isAdminRoute = pathname?.startsWith('/admin');
  
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  // Refs for closing menus when clicking outside
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // --- FETCH FUNCTION ---
  const fetchNotifications = async (userId) => {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  // --- INITIAL LOAD & POLLING ---
  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) return; 

    const parsed = JSON.parse(storedUser);
    setUser(parsed);
    
    fetchNotifications(parsed.id);

    // Run every 10 seconds. Using an empty array [] stops the page crash/spam!
    const intervalId = setInterval(() => {
      fetchNotifications(parsed.id);
    }, 10000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 👈 The eslint-disable line above stops React from throwing that error!

  // --- CLICK OUTSIDE HANDLER ---
  useEffect(() => {
    function handleClickOutside(event) {
      // Close notifications
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      // Close profile menu
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      // Close mobile menu
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- BELL CLICK HANDLER ---
  const handleBellClick = async () => {
    setShowDropdown(!showDropdown);
    setIsProfileOpen(false); // Close profile if open
    
    if (!showDropdown && unreadCount > 0) {
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
        
        setUnreadCount(0); 
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); 
      } catch (error) {
        console.error("Failed to mark notifications read", error);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('krishiUser');
    setUser(null);
    router.push('/');
  };

  // --- SMART NAV LINK ---
  const NavLink = ({ href, children, className = "" }) => {
    const isActive = pathname === href;
    // Adapt colors based on Admin Mode
    const activeText = isAdminRoute ? 'text-indigo-400 border-indigo-400' : 'text-green-600 border-green-600';
    const inactiveText = isAdminRoute ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-green-600';
    
    return (
      <Link 
        href={href} 
        className={`text-[13px] sm:text-sm font-bold transition-colors whitespace-nowrap ${className} ${
          isActive ? `${activeText} border-b-2 pb-1` : inactiveText
        }`}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav className={`sticky top-0 z-50 shadow-sm transition-colors duration-300 ${isAdminRoute ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LEFT SIDE: LOGO & BADGE */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🌾</span>
            <span className={`font-extrabold text-xl tracking-tight ${isAdminRoute ? 'text-white' : 'text-slate-900'}`}>
              Krishi Mitra
            </span>
            {isAdminRoute && (
              <span className="ml-2 text-[10px] bg-indigo-600 text-white px-2 py-1 rounded shadow-sm uppercase font-black tracking-widest">
                Admin
              </span>
            )}
          </Link>

          {/* RIGHT SIDE: LINKS & AUTH */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Mobile Hamburger */}
            {!isAdminRoute && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                  setShowDropdown(false);
                  setIsProfileOpen(false);
                }}
                className={`sm:hidden p-2 rounded-full transition-colors cursor-pointer ${
                  isAdminRoute ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                aria-label="Open menu"
                aria-expanded={isMobileMenuOpen}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            {/* Conditional Links based on Route */}
            {!isAdminRoute && (
              <>
                {/* 1. VISIBLE TO EVERYONE */}
                <NavLink href="/tools" className="hidden sm:inline-flex">Rent Tools</NavLink>
                <NavLink href="/seeds" className="hidden sm:inline-flex">Seed Exchange</NavLink>
                
                {/* 2. AI MITRA: Visible to all, but safely goes to /login if logged out to prevent the Back Button trap */}
                {/* <NavLink 
                  href={user ? "/smart-farm" : "/login"} 
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span className="text-lg">✨</span> AI Mitra
                </NavLink> */}

                {/* 3. STRICTLY LOGGED-IN USERS ONLY */}
                {user && (
                  <>
                    <NavLink 
                      href={user ? "/smart-farm" : "/login"} 
                      className="hidden sm:inline-flex text-indigo-600 hover:text-indigo-800 items-center gap-1"
                    >
                      <span className="text-lg">✨</span> AI Mitra
                    </NavLink>

                    <NavLink href="/messages" className="hidden sm:inline-flex">Messages</NavLink>
                    <NavLink href="/dashboard" className="hidden sm:inline-flex">Dashboard</NavLink>
                    
                    {/* Admin Door */}
                    {user.role === 'admin' && (
                      <Link href="/admin" className="hidden sm:inline-flex bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-bold text-sm hover:bg-red-100 transition-all">
                        👑 Admin Panel
                      </Link>
                    )}
                  </>
                )}
              </>
            )}

            {/* USER PROFILE & NOTIFICATIONS */}
            {user ? (
              <div className={`flex items-center gap-2 sm:gap-4 sm:border-l sm:pl-6 sm:ml-2 ${isAdminRoute ? 'sm:border-slate-700' : 'sm:border-slate-200'}`}>
                
                {/* 🔔 THE NOTIFICATION BELL */}
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={handleBellClick}
                    className={`p-2 rounded-full transition-colors cursor-pointer relative ${isAdminRoute ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu (Automatically switches to dark mode in admin) */}
                  {showDropdown && (
                    <div className={`absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[22rem] rounded-xl shadow-xl border overflow-hidden z-50 ${isAdminRoute ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className={`p-4 border-b flex justify-between items-center ${isAdminRoute ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <h3 className={`font-bold ${isAdminRoute ? 'text-white' : 'text-slate-800'}`}>Notifications</h3>
                        {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">{unreadCount} New</span>}
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className={`p-6 text-center text-sm ${isAdminRoute ? 'text-slate-400' : 'text-slate-500'}`}>
                            You're all caught up! 🌾
                          </div>
                        ) : (
                          <ul className={`divide-y ${isAdminRoute ? 'divide-slate-700' : 'divide-slate-100'}`}>
                            {notifications.map(notif => (
                              <li key={notif._id} className={`p-4 transition-colors ${!notif.isRead ? (isAdminRoute ? 'bg-slate-700/50' : 'bg-blue-50/30') : (isAdminRoute ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50')}`}>
                                <Link href={notif.link || '#'} onClick={() => setShowDropdown(false)} className="flex items-start gap-3">
                                  <div className="text-2xl mt-1">
                                    {notif.type === 'booking' ? '🚜' : notif.type === 'message' ? '💬' : notif.type === 'review' ? '⭐' : 'ℹ️'}
                                  </div>
                                  <div>
                                    <p className={`text-sm ${!notif.isRead ? 'font-bold' : ''} ${isAdminRoute ? 'text-slate-200' : 'text-slate-800'}`}>{notif.text}</p>
                                    <p className={`text-xs mt-1 ${isAdminRoute ? 'text-slate-400' : 'text-slate-400'}`}>{new Date(notif.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🧑 USER PROFILE MENU */}
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => { setIsProfileOpen(!isProfileOpen); setShowDropdown(false); }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors cursor-pointer active:scale-95 shadow-sm ${isAdminRoute ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <div className={`absolute right-0 mt-3 w-48 rounded-xl shadow-xl border py-2 z-50 overflow-hidden ${isAdminRoute ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className={`px-4 py-3 border-b mb-1 ${isAdminRoute ? 'border-slate-700' : 'border-slate-50'}`}>
                        <p className={`text-sm font-bold truncate ${isAdminRoute ? 'text-white' : 'text-slate-800'}`}>{user.name}</p>
                        <p className={`text-xs font-medium capitalize ${isAdminRoute ? 'text-slate-400' : 'text-slate-400'}`}>{user.role || 'Member'}</p>
                      </div>

                      <button 
                        onClick={handleLogout} 
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 transition-colors cursor-pointer flex items-center gap-2 ${isAdminRoute ? 'hover:bg-slate-700' : 'hover:bg-red-50'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`flex items-center gap-3 sm:gap-4 sm:border-l sm:pl-6 sm:ml-2 ${isAdminRoute ? 'sm:border-slate-700' : 'sm:border-slate-200'}`}>
                <Link href="/login" className={`hidden sm:inline-flex font-medium ${isAdminRoute ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Log in</Link>
                <Link href="/register" className="hidden sm:inline-flex bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-over Menu */}
      {!isAdminRoute && (
        <div
          className={`sm:hidden fixed inset-0 z-50 ${isMobileMenuOpen ? '' : 'pointer-events-none'}`}
          aria-hidden={!isMobileMenuOpen}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Panel */}
          <div
            ref={mobileMenuRef}
            className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white border-l border-slate-200 shadow-2xl transition-transform duration-200 ${
              isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
              <div className="font-extrabold text-slate-900 flex items-center gap-2">
                <span className="text-xl">🌾</span> Menu
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-700 cursor-pointer"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-2">
              <Link
                href="/tools"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl font-bold text-slate-800 hover:bg-slate-50 border border-slate-100"
              >
                🚜 Rent Tools
              </Link>
              <Link
                href="/seeds"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl font-bold text-slate-800 hover:bg-slate-50 border border-slate-100"
              >
                🌱 Seed Exchange
              </Link>

              {user ? (
                <>
                  <Link
                    href="/smart-farm"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-bold text-slate-800 hover:bg-slate-50 border border-slate-100"
                  >
                    ✨ AI Mitra
                  </Link>
                  <Link
                    href="/messages"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-bold text-slate-800 hover:bg-slate-50 border border-slate-100"
                  >
                    💬 Messages
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-bold text-slate-800 hover:bg-slate-50 border border-slate-100"
                  >
                    📊 Dashboard
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 border border-red-100"
                    >
                      👑 Admin Panel
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 border border-red-100 cursor-pointer"
                  >
                    🚪 Log Out
                  </button>
                </>
              ) : (
                <div className="pt-2 space-y-2">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-bold text-slate-800 hover:bg-slate-50 border border-slate-100"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 border border-green-600"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}