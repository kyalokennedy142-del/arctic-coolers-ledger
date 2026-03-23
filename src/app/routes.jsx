// src/app/routes.jsx
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
import AuthGuard from '../lib/AuthGuard';

// Page imports - EXACT casing
import LoginPage from '../modules/auth/LoginPage';
import SignupPage from '../modules/auth/SignupPage'; // lowercase 'p'
import DashboardPage from '../modules/dashboard/DashboardPage';
import CustomersPage from '../modules/customers/CustomersPage';
import BrokersPage from '../modules/brokers/BrokersPage';
import CreditStatementsPage from '../modules/credit-statements/CreditStatementsPage';
import PurchasesPage from '../modules/purchases/PurchasesPage';
import RemindersPage from '../modules/reminders/RemindersPage';
import AdminPage from '../modules/admin/AdminPage';

import BottleSalesPage from '../modules/bottle-sales/BottleSalesPage';

const Fallback = ({ msg }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center p-8 bg-white rounded-2xl shadow">
      <p className="text-red-600 font-medium mb-2">⚠️ {msg}</p>
      <a href="/login" className="text-blue-600 hover:underline">Return to Login</a>
    </div>
  </div>
);

export default createBrowserRouter([
  {
    path: '/',
    element: <AuthGuard><App /></AuthGuard>, // ✅ Keep for production security
    errorElement: <Fallback msg="Protected route error" />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'brokers', element: <BrokersPage /> },
      { path: 'credit-statements', element: <CreditStatementsPage /> },
      { path: 'purchases', element: <PurchasesPage /> },
      { path: 'reminders', element: <RemindersPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'bottle-sales', element: <BottleSalesPage /> },

    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);