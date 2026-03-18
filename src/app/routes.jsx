/* eslint-disable react-refresh/only-export-components */
// src/app/routes.jsx
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import AuthGuard from '../lib/AuthGuard';

// ✅ Page imports — EXACT casing must match filenames on disk
import LoginPage from '../modules/auth/LoginPage';        // ✅ LoginPage.jsx
import SignupPage from "../modules/auth/SignupPage";  // ✅ lowercase u, capital P     
import DashboardPage from '../modules/dashboard/DashboardPage';
import CustomersPage from '../modules/customers/CustomersPage';
import BrokersPage from '../modules/brokers/BrokersPage';
import CreditStatementsPage from '../modules/credit-statements/CreditStatementsPage';
import PurchasesPage from '../modules/purchases/PurchasesPage';
import RemindersPage from '../modules/reminders/RemindersPage';
import AdminPage from '../modules/admin/AdminPage';

// ✅ Fallback component for error boundaries
const FallbackPage = ({ message = 'Page not found' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">404</h1>
      <p className="text-gray-600">{message}</p>
      <a href="/" className="mt-4 text-blue-600 hover:underline">Return to Dashboard</a>
    </div>
  </div>
);

const router = createBrowserRouter([
  // 🔐 Protected routes (require authentication)
  {
    path: '/',
    element: (
      <AuthGuard>
        <App />
      </AuthGuard>
    ),
    errorElement: <FallbackPage message="Protected route error" />,
    children: [
      { index: true, element: <DashboardPage />, errorElement: <FallbackPage message="Dashboard failed to load" /> },
      { path: 'customers', element: <CustomersPage />, errorElement: <FallbackPage message="Customers page failed to load" /> },
      { path: 'brokers', element: <BrokersPage />, errorElement: <FallbackPage message="Brokers page failed to load" /> },
      { path: 'transactions', element: <CreditStatementsPage />, errorElement: <FallbackPage message="Statements page failed to load" /> },
      { path: 'purchases', element: <PurchasesPage />, errorElement: <FallbackPage message="Purchases page failed to load" /> },
      { path: 'reminders', element: <RemindersPage />, errorElement: <FallbackPage message="Reminders page failed to load" /> },
      { path: 'admin', element: <AdminPage />, errorElement: <FallbackPage message="Admin page failed to load" /> },
    ],
  },
  
  // 🔓 Public auth routes (NO AuthGuard)
  { path: '/login', element: <LoginPage />, errorElement: <FallbackPage message="Login page failed to load" /> },
  { path: '/signup', element: <SignupPage />, errorElement: <FallbackPage message="Signup page failed to load" /> },
  
  // Optional: Password reset route
  { 
    path: '/reset-password', 
    element: (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Reset Password</h1>
          <p className="text-gray-600">Check your email for reset instructions</p>
          <a href="/login" className="mt-4 inline-block text-blue-600 hover:underline">Return to Login</a>
        </div>
      </div>
    )
  },
  
  // 🔄 Catch-all: Redirect unknown routes to dashboard
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;