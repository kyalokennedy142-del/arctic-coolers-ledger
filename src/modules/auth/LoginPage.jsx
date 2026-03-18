 
// src/modules/auth/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase, isSupabaseReady, getSupabaseErrorHelp } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Optimized: Fast session check with timeout guard (prevents slow loading)
  useEffect(() => {
    let isMounted = true;
    
    // Skip entirely if Supabase isn't configured
    if (!isSupabaseReady()) {
      console.warn('⚠️ Supabase not configured - skipping session check');
      return;
    }
    
    const checkSession = async () => {
      // Guard: Add timeout to prevent infinite hang on 401
      const timeout = setTimeout(() => {
        if (isMounted) {
          console.warn('⏱️ Session check timed out - proceeding to login form');
        }
      }, 3000);
      
      try {
        const { data, error } = await supabase.auth.getSession();
        clearTimeout(timeout);
        
        if (!isMounted) return;
        
        if (error) {
          // Don't block on auth errors - let user try to login manually
          console.warn('⚠️ Session check error (non-blocking):', error.message);
          return;
        }
        
        if (data?.session) {
          console.log('✅ Valid session found, redirecting...');
          navigate('/');
        }
      } catch (error) {
        clearTimeout(timeout);
        if (!isMounted) return;
        console.warn('⚠️ Session check exception (non-blocking):', error);
      }
    };
    
    checkSession();
    
    return () => { 
      isMounted = false; 
    };
  }, [navigate]);

  // ✅ Handle login submission with fast-fail config check
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // ⚡ Fast fail: Check config before attempting login (prevents hanging)
    if (!isSupabaseReady()) {
      toast.error('⚙️ Configuration error: Supabase not initialized');
      console.error('🔧 Fix: Check .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('🔐 Attempting login for:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        
        // ✅ Handle specific Supabase errors with helpful messages
        const help = getSupabaseErrorHelp(error);
        
        if (help?.code === 'AUTH_401') {
          toast.error('Authentication service error. Please try again later.');
          console.error('🔧 Admin fix:', help.fix);
          return;
        }
        
        if (error.message?.includes('Invalid login credentials')) {
          toast.error('Wrong email or password. Please try again.');
        } else if (error.message?.includes('Email not confirmed')) {
          toast.error('Please confirm your email first. Check your inbox!');
        } else if (error.message?.includes('too many requests')) {
          toast.error('Too many attempts. Please wait a moment and try again.');
        } else {
          toast.error('Login failed. Please try again.');
        }
        return;
      }

      // ✅ Success
      toast.success('Welcome back!');
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
      
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Render loading state ONLY if Supabase not ready AND loading
  if (!isSupabaseReady() && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p>Initializing authentication...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-blue-100 mt-2">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          
          {/* Supabase Warning */}
          {!isSupabaseReady() && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800 font-medium">⚠️ Authentication temporarily unavailable</p>
              <p className="text-xs text-yellow-700 mt-1">Please contact your administrator if this persists.</p>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6" noValidate>
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-12 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-50"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading || !isSupabaseReady()}
                  autoComplete="email"
                  aria-label="Email address"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-12 pr-12 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-50"
                  placeholder="••••••••"
                  required
                  disabled={isLoading || !isSupabaseReady()}
                  autoComplete="current-password"
                  aria-label="Password"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                
                {/* Show/Hide Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading || !isSupabaseReady()}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !isSupabaseReady() || !email || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : !isSupabaseReady() ? (
                'Service Unavailable'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Sign up
              </Link>
            </p>
          </div>

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
      </div>
    </div>
  );
};

export default LoginPage;