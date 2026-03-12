import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🔥 DEBUG LOGS - Will show in browser console
console.log('🗄️ Supabase Client Initializing...');
console.log('   URL:', supabaseUrl ? '✅ ' + supabaseUrl.substring(0, 40) + '...' : '❌ MISSING');
console.log('   Key:', supabaseKey ? `✅ Set (length: ${supabaseKey?.length || 0})` : '❌ MISSING');

// Create global debug object for runtime inspection
window.__SUPABASE_DEBUG = {
  url: supabaseUrl,
  keyLength: supabaseKey?.length,
  initialized: false
};

// Check for missing credentials
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Supabase credentials missing at runtime!');
  
  // Show visible error on page
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#dc2626;color:#fff;padding:20px;border-radius:8px;z-index:9999;max-width:90%;font-family:system-ui;';
  errorDiv.innerHTML = `
    <strong style="font-size:18px">⚠️ Configuration Error</strong><br><br>
    Supabase credentials not loaded.<br>
    Check Vercel Environment Variables:<br>
    • VITE_SUPABASE_URL<br>
    • VITE_SUPABASE_ANON_KEY
  `;
  document.body.appendChild(errorDiv);
}

// Create and export the client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Mark as initialized
window.__SUPABASE_DEBUG.initialized = true;
console.log('✅ Supabase client created');

// Test connection immediately on load
supabase.from('customers').select('id').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('🔌 Supabase connection test: ❌ Failed -', error.message);
    window.__SUPABASE_DEBUG.connectionTest = { status: 'failed', error: error.message };
  } else {
    console.log('🔌 Supabase connection test: ✅ Success');
    window.__SUPABASE_DEBUG.connectionTest = { status: 'success', rows: data?.length || 0 };
  }
});