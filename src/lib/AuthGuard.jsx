import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const AuthGuard = ({ children }) => {
  const location = useLocation();
  
  // ✅ Check if user is logged in
  const isLoggedIn = localStorage.getItem('arctic-logged-in') === 'true';
  
  // ✅ If not logged in, redirect to login page
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // ✅ If logged in, render the protected content
  return children;
};

export default AuthGuard;