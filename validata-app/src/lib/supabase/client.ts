import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
if (!isValidUrl) {
  console.warn('Missing or invalid NEXT_PUBLIC_SUPABASE_URL. Falling back to placeholder for compilation.');
}

const urlToUse = isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co';
const keyToUse = supabaseAnonKey || 'placeholder-key';

// Browser client for Client Components - stores the session in cookies
// (via @supabase/ssr) instead of localStorage, so the server can read the
// same session (see src/lib/supabase/server.ts and src/proxy.ts).
export function createClient() {
  return createBrowserClient(urlToUse, keyToUse);
}
