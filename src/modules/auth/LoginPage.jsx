import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false); // Toggle between login/signup
  const navigate = useNavigate();
  const location = useLocation();

  // Check if already logged in on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        toast.success('Already logged in!');
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const {  error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      toast.success('Welcome back!');
      
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
      
    } catch (error) {
      console.error('Login error:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Wrong email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please confirm your email address first. Check your inbox!');
      } else {
        toast.error(`Login failed: ${error.message}`);
      }
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            // Optional: Add metadata about the user
            app_name: 'Arctic Coolers Ledger',
            signed_up_at: new Date().toISOString(),
          }
        },
      });

      if (error) throw error;

      toast.success('Account created! Please check your email to confirm your account.');
      setPassword('');
      
      // Optionally switch back to login mode
      setTimeout(() => {
        setIsSignUpMode(false);
      }, 2000);
      
    } catch (error) {
      console.error('Sign up error:', error.message);
      
      if (error.message.includes('User already registered')) {
        toast.error('This email is already registered. Please login instead.');
      } else if (error.message.includes('Weak password')) {
        toast.error('Password must be at least 6 characters.');
      } else {
        toast.error(`Sign up failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Aqua Credit Ledger</h1>
          <p className="text-blue-100 mt-2">
            {isSignUpMode ? 'Create your account' : 'Sign in to access your account'}
          </p>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          
          {/* Toggle Between Login/Signup */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsSignUpMode(false)}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                !isSignUpMode 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUpMode(true)}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                isSignUpMode 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={isSignUpMode ? handleSignUp : handleLogin} className="space-y-6">
            
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-12 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-12 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder={isSignUpMode ? "•••••••• (min 6 characters)" : "••••••••"}
                  required
                  minLength={isSignUpMode ? 6 : undefined}
                  disabled={isLoading}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              {isSignUpMode && (
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSignUpMode ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                isSignUpMode ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Info Box for Sign-Up */}
          {isSignUpMode && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                📧 After signing up, you'll receive a confirmation email. 
                Click the link in the email to activate your account.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              🔒 Secure authentication via Supabase
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              Session persists across devices
            </p>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-blue-100 text-sm">
            Need help? Contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;