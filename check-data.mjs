import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

async function main() {
  // Check existing tables and data
  const { data: profiles, error: profilesErr } = await supabase
    .from('dropshipper_profiles')
    .select('id, store_slug, store_name, business_name, is_approved')
    .order('store_slug');

  if (profilesErr) {
    console.error('Error fetching profiles:', profilesErr.message);
  } else {
    console.log('=== dropshipper_profiles ===');
    console.log(JSON.stringify(profiles, null, 2));
  }

  const { data: categories, error: catsErr } = await supabase
    .from('categories')
    .select('id, name, slug');

  if (catsErr) {
    console.error('Error fetching categories:', catsErr.message);
  } else {
    console.log('=== categories ===');
    console.log(JSON.stringify(categories, null, 2));
  }

  const { data: products, error: prodsErr } = await supabase
    .from('products')
    .select('id, name, supplier_id, cost_price, suggested_price')
    .eq('is_active', true);

  if (prodsErr) {
    console.error('Error fetching products:', prodsErr.message);
  } else {
    console.log('=== products (active) ===');
    console.log(JSON.stringify(products, null, 2));
  }

  const { data: dps, error: dpsErr } = await supabase
    .from('dropshipper_products')
    .select('id, dropshipper_id, product_id, custom_price, is_published')
    .eq('is_published', true);

  if (dpsErr) {
    console.error('Error fetching dropshipper_products:', dpsErr.message);
  } else {
    console.log('=== dropshipper_products (published) ===');
    console.log(JSON.stringify(dps, null, 2));
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});