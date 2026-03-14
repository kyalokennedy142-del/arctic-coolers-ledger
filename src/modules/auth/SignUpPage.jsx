import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const SignUpPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    requirements: {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecial: false,
    }
  });
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/');
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };
    checkSession();
  }, [navigate]);

  // Calculate password strength
  useEffect(() => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;

    setPasswordStrength({ score, requirements });
  }, [password]);

  const handleSignUp = async (e) => {
  e.preventDefault();
  
  // Validate passwords match
  if (password !== confirmPassword) {
    toast.error('Passwords do not match!');
    return;
  }

  // Validate password strength
  if (passwordStrength.score < 4) {
    toast.error('Password is too weak. Please meet all requirements.');
    return;
  }

  setIsLoading(true);

  try {
    // 1. Create Supabase auth user
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (authError) throw authError;

    // 2. Create pending approval record (with retry logic)
    let approvalError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase
        .from('user_approvals')
        .insert([{
          email: email.trim().toLowerCase(),
          user_id: user?.id,
          status: 'pending',
          role: 'user',
          created_at: new Date().toISOString()
        }]);
      
      if (!error) break;
      approvalError = error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }

    if (approvalError) {
      console.warn('⚠️ Could not create approval record:', approvalError.message);
      // Continue anyway - user can still login, approval check will create record
    }

    toast.success('Account created! Waiting for admin approval. You will receive an email when approved.');
    
    // Clear form
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPasswordStrength({ score: 0, requirements: { minLength: false, hasUppercase: false, hasLowercase: false, hasNumber: false, hasSpecial: false } });
    
    // Redirect to login after 3 seconds
    setTimeout(() => {
      navigate('/login');
    }, 3000);
    
  } catch (error) {
    console.error('Sign up error:', error);
    
    if (error.message?.includes('User already registered')) {
      toast.error('This email is already registered. Please login instead.');
    } else if (error.message?.includes('Weak password')) {
      toast.error('Password must be at least 8 characters with mixed case, numbers, and symbols.');
    } else {
      toast.error('Sign up failed. Please try again.');
    }
  } finally {
    setIsLoading(false);
  }
};
  

  // Get password strength color
  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get password strength text
  const getStrengthText = () => {
    if (passwordStrength.score <= 2) return 'Weak';
    if (passwordStrength.score <= 3) return 'Medium';
    return 'Strong';
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
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-blue-100 mt-2">Join Arctic Coolers Ledger</p>
        </div>

        {/* Sign-Up Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSignUp} className="space-y-6" noValidate>
            
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-12 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-12 pr-12 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-label="Password"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                
                {/* Show/Hide Password Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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

              {/* Password Strength Meter */}
              {password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password Strength</span>
                    <span className={`text-xs font-semibold ${
                      passwordStrength.score <= 2 ? 'text-red-600' :
                      passwordStrength.score <= 3 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getStrengthColor()}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    ></div>
                  </div>

                  {/* Password Requirements */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <RequirementItem met={passwordStrength.requirements.minLength} text="8+ characters" />
                    <RequirementItem met={passwordStrength.requirements.hasUppercase} text="Uppercase letter" />
                    <RequirementItem met={passwordStrength.requirements.hasLowercase} text="Lowercase letter" />
                    <RequirementItem met={passwordStrength.requirements.hasNumber} text="Number" />
                    <RequirementItem met={passwordStrength.requirements.hasSpecial} text="Special character" className="col-span-2" />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 pl-12 pr-12 text-lg focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-label="Confirm password"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                
                {/* Show/Hide Confirm Password Toggle */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
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
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Sign-Up Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password || !confirmPassword || passwordStrength.score < 4 || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              📧 After signing up, you'll receive a confirmation email. Click the link to activate your account.
            </p>
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              🔒 Secure authentication via Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for password requirements
const RequirementItem = ({ met, text, className = '' }) => (
  <div className={`flex items-center gap-2 text-xs ${className}`}>
    <svg className={`h-4 w-4 ${met ? 'text-green-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className={met ? 'text-green-700' : 'text-gray-500'}>{text}</span>
  </div>
);

export default SignUpPage;