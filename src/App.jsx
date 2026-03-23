// src/App.jsx
import React, { useEffect } from 'react';  // ✅ Only import what you use
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

function App() {
  // ✅ useEffect MUST be inside the component function
  useEffect(() => {
    // Debug: Log env vars (remove in production)
    console.log('🔍 Vite Env Debug:', {
      hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      urlPreview: import.meta.env.VITE_SUPABASE_URL?.substring(0, 40) + '...',
      allViteVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
    });
  }, []);  // ✅ Empty dependency array = run once on mount

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Outlet renders the matched child route component */}
      <Outlet />
      
      {/* Global toast notification container */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;