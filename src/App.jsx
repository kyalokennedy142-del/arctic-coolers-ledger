// src/App.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

/**
 * Main App Layout Component
 * 
 * This component serves as the root layout for all routed pages.
 * It provides:
 * - A consistent background and minimum height for the viewport
 * - The Outlet for rendering child routes from react-router-dom
 * - A global Toaster for displaying notifications anywhere in the app
 * 
 * Note: This component should NOT contain the ReactDOM.render logic.
 * That belongs in src/main.jsx (or src/index.jsx).
 */
function App() {
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

// eslint-disable-next-line react-hooks/rules-of-hooks, no-undef
useEffect(() => {
  console.log('🔍 Vite Env Debug:', {
    hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    urlPreview: import.meta.env.VITE_SUPABASE_URL?.substring(0, 40) + '...',
    allViteVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
  });
}, []);


export default App;