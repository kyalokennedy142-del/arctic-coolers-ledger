// src/pages/auth/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error) {
      // Handle email not confirmed error
      if (error.message?.includes('Email not confirmed')) {
        toast.error('Please confirm your email first. Check your inbox!');
      } else {
        toast.error(error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl p-8 shadow-2xl w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600">Sign in to Aqua Credit Ledger</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-600 mt-6">
          No account? <Link to="/signup" className="text-blue-600 hover:underline font-medium">Sign up</Link>
        </p>
        
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700">
          ⚠️ If you just signed up, make sure to confirm your email before logging in.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;