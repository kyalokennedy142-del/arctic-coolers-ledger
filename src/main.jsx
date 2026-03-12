import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';  // Import Toaster for notifications
import { DataProvider } from './context/DataContext';
import router from './app/routes';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DataProvider>
      <RouterProvider router={router} />
      <Toaster />  {/* Add Toaster to display notifications */}
    </DataProvider>
  </React.StrictMode>
);
