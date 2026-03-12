import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const AuthGuard = ({ children }) => {
  const location = useLocation();
  
  const isLoggedIn = localStorage.getItem('arctic-logged-in') === 'true';
  
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

export default AuthGuard;