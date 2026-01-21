import { createClient } from '@supabase/supabase-js';

// Access env vars safely
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

// Check if configured
export const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isConfigured) {
  console.warn("Supabase Environment Variables missing! App running in placeholder mode.");
}

// Create client safely. If missing, use placeholders to prevent JS runtime crash.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'student';
  full_name: string;
  avatar_url?: string;
};