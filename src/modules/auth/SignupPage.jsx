// src/pages/auth/SignupPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signUp(email, password, { name });
      setSignedUp(true);
      toast.success('Check your email to confirm your account!');
    } catch (error) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (signedUp) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur rounded-2xl p-8 shadow-2xl w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
          <p className="text-gray-600 mb-6">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          <button onClick={() => navigate('/login')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-2xl p-8 shadow-2xl w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600">Join Aqua Credit Ledger</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required />
            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          🔒 Your account requires email verification. Check your inbox after signing up.
        </div>
      </div>
    </div>
  );
};

export default SignupPage;