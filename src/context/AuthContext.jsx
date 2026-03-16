// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

/**
 * Custom hook to use the auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        // If using Supabase Auth:
        if (supabase?.auth) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) throw sessionError;
          
          if (isMounted) {
            setUser(session?.user ?? null);
            setIsAuthenticated(!!session);
          }
        } else {
          // Fallback: check localStorage for demo/dev mode
          const saved = localStorage.getItem('arctic-auth');
          if (saved) {
            const auth = JSON.parse(saved);
            if (isMounted) {
              setUser(auth.user ?? null);
              setIsAuthenticated(auth.authenticated ?? false);
            }
          }
        }
      } catch (err) {
        console.error('❌ Session check failed:', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkSession();

    // Supabase auth state listener (if available)
    let authListener;
    if (supabase?.auth) {
      authListener = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);
        if (session) {
          localStorage.setItem('arctic-auth', JSON.stringify({
            authenticated: true,
            user: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name
            }
          }));
        }
      });
    }

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // ==================== AUTH METHODS ====================

  /**
   * Sign in with email/password
   */
  const signIn = useCallback(async (email, password) => {
    setError(null);
    try {
      if (supabase?.auth) {
        // Supabase Auth sign in
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        setUser(user);
        setIsAuthenticated(true);
        return { success: true, user };
      } else {
        // Demo mode: simple credential check
        if (email && password) {
          const demoUser = {
            id: 'demo-user-123',
            email,
            name: email.split('@')[0],
            user_metadata: { name: email.split('@')[0] }
          };
          setUser(demoUser);
          setIsAuthenticated(true);
          localStorage.setItem('arctic-auth', JSON.stringify({
            authenticated: true,
            user: {
              id: demoUser.id,
              email: demoUser.email,
              name: demoUser.name
            }
          }));
          return { success: true, user: demoUser };
        }
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      console.error('❌ Sign in failed:', err);
      setError(err.message || 'Sign in failed');
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Sign up with email/password
   */
  const signUp = useCallback(async (email, password, metadata = {}) => {
    setError(null);
    try {
      if (supabase?.auth) {
        // Supabase Auth sign up
        const { data: { user }, error } = await supabase.auth.signUp({
          email,
          password,
          options: {  user_metadata: metadata }
        });
        
        if (error) throw error;
        
        // Note: User may need to confirm email depending on Supabase settings
        setUser(user);
        setIsAuthenticated(!!user);
        return { success: true, user, needsConfirmation: !user };
      } else {
        // Demo mode: auto-create user
        const newUser = {
          id: `demo-${Date.now()}`,
          email,
          name: metadata.name || email.split('@')[0],
          user_metadata: metadata
        };
        setUser(newUser);
        setIsAuthenticated(true);
        localStorage.setItem('arctic-auth', JSON.stringify({
          authenticated: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name
          }
        }));
        return { success: true, user: newUser };
      }
    } catch (err) {
      console.error('❌ Sign up failed:', err);
      setError(err.message || 'Sign up failed');
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    try {
      if (supabase?.auth) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem('arctic-auth');
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('❌ Sign out failed:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Reset password (Supabase only)
   */
  const resetPassword = useCallback(async (email) => {
    if (!supabase?.auth) {
      return { success: false, error: 'Password reset not available in demo mode' };
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('❌ Password reset failed:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ==================== CONTEXT VALUE ====================
  
  const value = {
    // State
    isAuthenticated,
    user,
    loading,
    error,
    
    // Methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    
    // Helpers
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;