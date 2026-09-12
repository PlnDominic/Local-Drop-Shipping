import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_verified, created_at')
    .order('created_at');

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('=== users ===');
    console.log(JSON.stringify(users, null, 2));
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});