import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
if (!isValidUrl) {
  console.warn('Missing or invalid NEXT_PUBLIC_SUPABASE_URL. Falling back to placeholder for compilation.');
}

const urlToUse = isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co';
const keyToUse = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(urlToUse, keyToUse);

