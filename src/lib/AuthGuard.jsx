// src/lib/AuthGuard.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthGuard({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading while checking auth (DON'T redirect yet)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Redirect to login if NOT authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if non-admin tries admin route
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}