// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseReady()) {
      console.warn('⚠️ Supabase not configured');
      setLoading(false);
      return;
    }

    // ✅ Restore session from localStorage (clean .then() pattern)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAdmin(currentUser?.email?.toLowerCase() === 'kyalokennedy142@gmail.com');
      setLoading(false);
    });

    // ✅ Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAdmin(currentUser?.email?.toLowerCase() === 'kyalokennedy142@gmail.com');
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: userData }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  const value = { user, loading, isAdmin, signIn, signUp, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;