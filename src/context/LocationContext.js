'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext();

export function LocationProvider({ children }) {
  // 'gps' or 'pincode'
  const [browseMode, setBrowseMode] = useState('gps'); 
  const [pincode, setPincode] = useState('');
  
  // GPS Coordinates
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [villageName, setVillageName] = useState('India');

  // Load saved preferences on startup (Optional but a great UX feature!)
  useEffect(() => {
    const savedMode = localStorage.getItem('krishi_browseMode');
    const savedPincode = localStorage.getItem('krishi_pincode');
    if (savedMode) setBrowseMode(savedMode);
    if (savedPincode) setPincode(savedPincode);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('krishi_browseMode', browseMode);
    localStorage.setItem('krishi_pincode', pincode);
  }, [browseMode, pincode]);

  return (
    <LocationContext.Provider value={{ 
      browseMode, setBrowseMode, 
      pincode, setPincode, 
      lat, setLat, 
      lng, setLng, 
      villageName, setVillageName 
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);