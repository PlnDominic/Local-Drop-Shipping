import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public, browser-safe Supabase config. These are exposed to the client by design
// (the anon key is meant to be public); all data access is governed by RLS policies.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced loudly so a misconfigured deploy is obvious rather than silently empty.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in your environment (see .env.example).',
  );
}

// Fall back to harmless placeholders when env is absent (e.g. during CI builds) so the
// client constructs without throwing; real credentials are required at runtime.
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
