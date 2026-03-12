import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Simple, clear logging
console.log('🔌 Supabase:', {
  url: supabaseUrl ? '✅' : '❌',
  key: supabaseKey ? `✅ (${supabaseKey.length} chars)` : '❌'
});

export const supabase = createClient(supabaseUrl, supabaseKey);