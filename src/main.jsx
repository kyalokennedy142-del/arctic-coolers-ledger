// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';

if (typeof window !== 'undefined') {
  window.React = React;
  window.useEffect = React.useEffect;
  window.useState = React.useState;
  window.useMemo = React.useMemo;
  window.useContext = React.useContext;
  window.createContext = React.createContext;
}

import { RouterProvider } from 'react-router-dom';
import { DataProvider } from './Context/DataContext';
import { AuthProvider } from './Context/AuthContext';
import router from './app/routes';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('✅ SW registered:', reg.scope))
      .catch((err) => console.error('❌ SW failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);