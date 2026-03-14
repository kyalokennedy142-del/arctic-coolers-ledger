import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

const AuthGuard = ({ children }) => {
  const location = useLocation();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isApproved, setIsApproved] = useState(true);
  const [, setUserRole] = useState('user');

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // 1. Check Supabase session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) {
            setIsAuthenticated(false);
            setCheckingAuth(false);
          }
          return;
        }

        // 2. No session = not authenticated
        if (!session) {
          if (mounted) {
            setIsAuthenticated(false);
            setCheckingAuth(false);
          }
          return;
        }

        // 3. Skip approval check for public routes
        const publicRoutes = ['/login', '/signup'];
        if (publicRoutes.includes(location.pathname)) {
          if (mounted) {
            setIsAuthenticated(true);
            setCheckingAuth(false);
          }
          return;
        }

        // 4. Check approval status from user_approvals table
        try {
          const { data: approval, error: approvalError } = await supabase
            .from('user_approvals')
            .select('status, role')
            .eq('email', session.user.email)
            .maybeSingle();

          // Handle table not existing or other errors gracefully
          if (approvalError) {
            console.warn('⚠️ Approval check error:', approvalError.message);
            
            // If table doesn't exist, allow access (development mode)
            if (approvalError.code === 'PGRST116' || 
                approvalError.message?.includes('relation') ||
                approvalError.message?.includes('does not exist')) {
              console.log('⚠️ user_approvals table not found - allowing access (dev mode)');
              if (mounted) {
                setIsAuthenticated(true);
                setIsApproved(true);
                setUserRole('user');
                localStorage.setItem('user_role', 'user');
                setCheckingAuth(false);
              }
              return;
            }
            
            // For other errors, log but allow access (fail-open for UX)
            console.warn('⚠️ Continuing with access due to approval check error');
          }

          // 5. If no approval record, auto-create one (for existing users)
          if (!approval) {
            console.log('ℹ️ Creating approval record for:', session.user.email);
            
            const { error: insertError } = await supabase
              .from('user_approvals')
              .insert([{
                email: session.user.email,
                user_id: session.user.id,
                status: 'approved', // Auto-approve existing users
                role: 'user',
                reviewed_at: new Date().toISOString(),
                reviewed_by: session.user.id
              }]);

            if (insertError) {
              console.warn('⚠️ Could not create approval record:', insertError.message);
            }
            
            if (mounted) {
              setIsAuthenticated(true);
              setIsApproved(true);
              setUserRole('user');
              localStorage.setItem('user_role', 'user');
              setCheckingAuth(false);
            }
            return;
          }

          // 6. Check approval status
          if (approval.status !== 'approved') {
            if (mounted) {
              setIsApproved(false);
              setCheckingAuth(false);
            }
            return;
          }

          // 7. Store role for UI
          const role = approval.role || 'user';
          if (mounted) {
            setUserRole(role);
            localStorage.setItem('user_role', role);
            setIsAuthenticated(true);
            setIsApproved(true);
          }

        } catch (approvalError) {
          console.error('Approval check exception:', approvalError);
          // Fail-open: allow access if check fails
          if (mounted) {
            setIsAuthenticated(true);
            setIsApproved(true);
          }
        }

      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setIsAuthenticated(!!session);
          if (!session) {
            setIsApproved(true);
            setUserRole('user');
            localStorage.removeItem('user_role');
          }
          setCheckingAuth(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [location.pathname]);

  // Show loading state
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Not approved → show pending message
  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Account Pending Approval</h3>
            <p className="mt-3 text-gray-600">
              Your account is waiting for admin approval. You will receive an email at <strong>{supabase.auth.getUser().then(u => u.data.user?.email)}</strong> once approved.
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="mt-6 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and approved → render protected content
  return children;
};

export default AuthGuard;