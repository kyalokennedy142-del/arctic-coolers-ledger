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

export default supabase;