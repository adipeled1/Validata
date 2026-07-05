import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
const urlToUse = isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co';
const keyToUse = supabaseAnonKey || 'placeholder-key';

// Server client for Server Components/Actions/Route Handlers - reads the
// session from cookies (kept in sync by src/proxy.ts on every request).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(urlToUse, keyToUse, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written - safe to ignore since proxy.ts refreshes the session
          // on every request anyway.
        }
      },
    },
  });
}
