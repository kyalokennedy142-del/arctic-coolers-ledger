import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const AcceptInvite = () => {
  // eslint-disable-next-line no-empty-pattern
  const [] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, requirements: {} });
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // Calculate password strength
  useEffect(() => {
    const requirements = {
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
    const score = Object.values(requirements).filter(Boolean).length;
    setPasswordStrength({ score, requirements });
  }, [newPassword]);

  // Smart validation: Only show error after user types in confirm field
  useEffect(() => {
    if (confirmPassword.length > 0) {
      setConfirmError(newPassword !== confirmPassword ? 'Passwords do not match!' : '');
    } else {
      setConfirmError('');
    }
  }, [newPassword, confirmPassword]);

  // Handle password update + approval queue
  const handleAcceptInvite = async (e) => {
    e.preventDefault();
    
    // Final validation
    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match!');
      toast.error('Passwords do not match!');
      return;
    }
    if (passwordStrength.score < 4) {
      toast.error('Password is too weak. Please meet all requirements.');
      return;
    }

    setIsLoading(true);
    setIsProcessing(true);

    try {
      // 1. Update user password (this finalizes the invite)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // 2. Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Could not get user email');

      // 3. Insert into user_approvals with status: 'pending'
      // This ensures admin must still approve before dashboard access
      const { error: approvalError } = await supabase
        .from('user_approvals')
        .insert([{
          email: user.email.toLowerCase(),
          user_id: user.id,
          status: 'pending',  // ⚠️ Admin must approve before access
          role: 'user',
          created_at: new Date().toISOString(),
        }]);

      if (approvalError) {
        console.warn('⚠️ Could not create approval record:', approvalError.message);
        // Continue anyway - user can login, approval check will handle it
      }

      toast.success('✅ Account activated! Waiting for admin approval.');
      
      // Clear form
      setNewPassword('');
      setConfirmPassword('');
      setConfirmError('');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Account activated! Please login and wait for admin approval.' 
          } 
        });
      }, 3000);
      
    } catch (error) {
      console.error('Accept invite error:', error);
      
      if (error.message?.includes('Token has expired')) {
        toast.error('Invite link has expired. Please request a new invite.');
      } else if (error.message?.includes('Invalid token')) {
        toast.error('Invalid invite link. Please check your email.');
      } else {
        toast.error('Failed to activate account. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  // Helper: Password strength display
  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  const getStrengthText = () => {
    if (passwordStrength.score <= 2) return 'Weak';
    if (passwordStrength.score <= 3) return 'Medium';
    return 'Strong';
  };

  // Helper: Is form valid?
  const isFormValid = () => {
    return (
      newPassword &&
      confirmPassword &&
      newPassword === confirmPassword &&
      passwordStrength.score >= 4 &&
      !confirmError &&
      !isLoading
    );
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
          <h1 className="text-3xl font-bold text-white">Activate Your Account</h1>
          <p className="text-blue-100 mt-2">Set your password to join Arctic Coolers Ledger</p>
        </div>

        {/* Accept Invite Card - Glassmorphism Style */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleAcceptInvite} className="space-y-6" noValidate>
            
            {/* New Password Field */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-12 pr-12 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-blue-50/50"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-3 animate-fade-in">
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
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <ReqItem met={passwordStrength.requirements.minLength} text="8+ chars" />
                    <ReqItem met={passwordStrength.requirements.hasUppercase} text="Uppercase" />
                    <ReqItem met={passwordStrength.requirements.hasLowercase} text="Lowercase" />
                    <ReqItem met={passwordStrength.requirements.hasNumber} text="Number" />
                    <ReqItem met={passwordStrength.requirements.hasSpecial} text="Special char" className="col-span-2" />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="animate-fade-in">
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
                  className={`w-full rounded-xl border px-4 py-3 pl-12 pr-12 text-lg focus:outline-none focus:ring-2 transition-all bg-blue-50/50 ${
                    confirmError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              
              {/* Error message - fade-in animation */}
              {confirmError && (
                <p className="text-red-500 text-xs mt-1 animate-fade-in flex items-center gap-1">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {confirmError}
                </p>
              )}
              
              {/* Success indicator */}
              {confirmPassword && !confirmError && newPassword === confirmPassword && (
                <p className="text-green-500 text-xs mt-1 animate-fade-in flex items-center gap-1">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Passwords match!
                </p>
              )}
            </div>

            {/* Join Button */}
            <button
              type="submit"
              disabled={!isFormValid()}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Activating...
                </span>
              ) : 'Join Arctic Coolers Ledger'}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              🔒 After setting your password, your account will be reviewed by an administrator. You'll receive an email once approved.
            </p>
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have a password?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Sign in instead
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for password requirements
const ReqItem = ({ met, text, className = '' }) => (
  <div className={`flex items-center gap-2 text-xs ${className}`}>
    <svg className={`h-4 w-4 ${met ? 'text-green-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className={met ? 'text-green-700' : 'text-gray-500'}>{text}</span>
  </div>
);

export default AcceptInvite;