// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log initialization status
console.log('🔌 Supabase Client:', {
  url: supabaseUrl ? '✅' : '❌',
  key: supabaseAnonKey ? `✅ (${supabaseAnonKey.length} chars)` : '❌'
});

// Create Supabase client (or null if credentials missing)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper: Check if Supabase is ready
export const isSupabaseReady = () => !!supabase;

// Helper: Get user-friendly error info
export const getSupabaseErrorHelp = (error) => {
  if (!error) return null;
  
  if (error.status === 401 || error.message?.includes('Invalid API key')) {
    return {
      code: 'AUTH_401',
      message: 'Invalid API key - credentials mismatch',
      fix: 'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY match the same Supabase project'
    };
  }
  
  if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
    return {
      code: 'TABLE_404',
      message: 'Table not found in Supabase',
      fix: 'Create the table in Supabase Dashboard'
    };
  }
  
  return {
    code: 'UNKNOWN',
    message: error.message || 'Unknown error',
    fix: 'Check browser console and Supabase logs'
  };
};

// Default export for compatibility
export default supabase;