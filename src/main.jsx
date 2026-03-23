// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import router from './app/routes';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);