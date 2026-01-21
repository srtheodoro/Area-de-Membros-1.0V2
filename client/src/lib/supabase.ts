import { createClient } from '@supabase/supabase-js';

// Access env vars. Vite uses import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase Variables!");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'student';
  full_name: string;
  avatar_url?: string;
};
