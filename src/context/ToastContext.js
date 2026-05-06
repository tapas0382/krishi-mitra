'use client';
import { createContext, useContext, useState } from 'react';

// Create the context
const ToastContext = createContext();

// This is the wrapper we will put around your whole app
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* The Global Floating UI that lives above every page */}
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 lg:translate-x-0 lg:left-auto lg:right-6 z-[9999] transition-all duration-300 ease-out animate-bounce">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : 
            toast.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' : 
            'bg-blue-50/90 border-blue-200 text-blue-800'
          }`}>
            <span className="text-2xl drop-shadow-sm">
              {toast.type === 'error' ? '🚨' : toast.type === 'success' ? '✅' : 'ℹ️'}
            </span>
            <p className="font-bold text-[15px]">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">✕</button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

// A custom hook so your pages can easily trigger the popup
export const useToast = () => useContext(ToastContext);