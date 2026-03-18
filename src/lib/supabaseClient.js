// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Read environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Validate configuration upfront
const configValid = supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase.co');

// Log initialization status (visible in console)
console.group('🔐 Supabase Initialization');
console.log('URL:', configValid ? '✅' : '❌ Missing/Invalid');
console.log('Key:', supabaseAnonKey ? `✅ (${supabaseAnonKey.length} chars)` : '❌ Missing');
console.log('Project Ref:', supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'N/A');
console.groupEnd();

// Create client only if config is valid
export const supabase = configValid 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Faster timeout for dev
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      },
      global: { headers: { 'x-client-info': 'arctic-ledger/1.0.0' } }
    })
  : null;

// ✅ Fast check: Is Supabase ready to use?
export const isSupabaseReady = () => {
  if (!supabase) return false;
  try {
    // Quick validation: client should have auth property
    return typeof supabase.auth?.getSession === 'function';
  } catch {
    return false;
  }
};

// ✅ Helper: Get actionable error help
export const getSupabaseErrorHelp = (error) => {
  if (!error) return null;
  
  const msg = error.message?.toLowerCase() || '';
  const status = error.status;
  
  // 🔑 Invalid API Key (your current issue)
  if (status === 401 || msg.includes('invalid api key') || msg.includes('jwt')) {
    return {
      code: 'AUTH_401',
      severity: 'critical',
      message: 'API key mismatch or project not found',
      fix: [
        '1. Verify .env.local exists in project root',
        '2. Confirm VITE_SUPABASE_URL matches your project exactly',
        '3. Get fresh anon key from: Dashboard → Settings → API',
        '4. Restart dev server: Ctrl+C → npm run dev'
      ].join('\n')
    };
  }
  
  // 📦 Table doesn't exist
  if (error.code === 'PGRST116' || msg.includes('does not exist')) {
    return {
      code: 'TABLE_404',
      severity: 'warning',
      message: 'Table not found in Supabase',
      fix: 'Create table in Dashboard → Table Editor or run migration SQL'
    };
  }
  
  // 🔒 RLS blocking access
  if (msg.includes('row level security') || msg.includes('permission denied')) {
    return {
      code: 'RLS_BLOCKED',
      severity: 'warning', 
      message: 'Row Level Security policy blocking access',
      fix: 'Add permissive policy for testing: CREATE POLICY "Allow all" ON table FOR ALL USING (true);'
    };
  }
  
  // 🌐 Network issues
  if (msg.includes('fetch') || msg.includes('network') || status >= 500) {
    return {
      code: 'NETWORK',
      severity: 'warning',
      message: 'Network or server error',
      fix: 'Check internet connection, Supabase status (status.supabase.com), or try again'
    };
  }
  
  // ❓ Unknown
  return {
    code: 'UNKNOWN',
    severity: 'error',
    message: error.message || 'Unknown error',
    fix: 'Check browser console → Network tab → Supabase request → Response'
  };
};

// ✅ Debug utility: Run in console to test connection
export const testSupabaseConnection = async () => {
  if (!isSupabaseReady()) {
    console.error('❌ Supabase not configured');
    return false;
  }
  
  try {
    console.log('🧪 Testing connection...');
    
    // Test 1: Auth endpoint
    const { error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    console.log('✅ Auth endpoint: OK');
    
    // Test 2: REST endpoint (public table test)
    // eslint-disable-next-line no-unused-vars
    const { data, error: restError } = await supabase
      .from('brokers')
      .select('id')
      .limit(1);
      
    if (restError && restError.code !== 'PGRST116') {
      // PGRST116 = table doesn't exist (OK for testing)
      throw restError;
    }
    console.log('✅ REST endpoint: OK');
    
    console.log('🎉 All tests passed!');
    return true;
  } catch (err) {
    console.error('❌ Connection test failed:', err);
    console.log('💡 Help:', getSupabaseErrorHelp(err)?.fix);
    return false;
  }
};

export default supabase;