import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔌 Supabase Client Initializing...');
console.log('  URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  Key:', supabaseKey ? `✅ Set (${supabaseKey.length} chars)` : '❌ Missing');

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

  // ✅ Add at the END of supabaseClient.js, before export

// Handle auth state changes gracefully
supabase.auth.onAuthStateChange((event) => {
  // Only log important events
  if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
    console.log(`🔐 Auth event: ${event}`);
  }
  // Ignore TOKEN_REFRESHED errors when no user is logged in
});



export default supabase;