import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Anonymous, read-only client for server-rendered public pages (product pages, sitemap). */
function publicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

export interface PageVariant {
  id: string;
  label: string;
  skuSuffix: string;
  priceAdjustment: number;
  stockQty: number;
}

/** Everything a product page needs. Deliberately excludes wholesale cost. */
export interface ProductPageData {
  id: string; // the store item id (dropshipper_products.id)
  productId: string;
  name: string;
  description: string;
  images: string[];
  sku: string;
  specs: { label: string; value: string }[];
  price: number;
  suggestedPrice: number;
  stockQty: number;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string; verified: boolean };
  store: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string } | null;
  variants: PageVariant[];
}

const cleanSpecs = (raw: unknown): { label: string; value: string }[] =>
  Array.isArray(raw)
    ? raw
        .map((r) => ({ label: String((r as { label?: unknown })?.label ?? '').trim(), value: String((r as { value?: unknown })?.value ?? '').trim() }))
        .filter((r) => r.label && r.value)
    : [];

/** Returns null when the item doesn't exist or isn't published; throws only on unexpected failures. */
export async function getProductPageData(id: string): Promise<ProductPageData | null> {
  const sb = publicClient();
  if (!sb || !isUuid(id)) return null;

  const { data: dp, error } = await sb
    .from('dropshipper_products')
    .select(
      'id, dropshipper_id, product_id, custom_price, custom_description, is_published, created_at, updated_at, ' +
        'products(id, supplier_id, category_id, name, description, images, sku, specs, suggested_price, stock_qty, is_active)',
    )
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  if (!dp) return null;

  const row = dp as unknown as {
    id: string; dropshipper_id: string; product_id: string; custom_price: number | string;
    custom_description: string | null; created_at: string; updated_at: string;
    products: {
      id: string; supplier_id: string; category_id: string | null; name: string; description: string;
      images: string[] | null; sku: string | null; specs?: unknown; suggested_price: number | string;
      stock_qty: number; is_active: boolean;
    } | null;
  };
  const p = row.products;
  if (!p || p.is_active === false) return null;

  const [store, supplier, category, variantsRes] = await Promise.all([
    sb.from('dropshipper_profiles').select('id, store_name, store_slug').eq('id', row.dropshipper_id).maybeSingle(),
    sb.from('supplier_profiles').select('*').eq('id', p.supplier_id).maybeSingle(),
    p.category_id ? sb.from('categories').select('id, name, slug').eq('id', p.category_id).maybeSingle() : Promise.resolve({ data: null }),
    // Options are optional (the table exists only after the catalog database update).
    sb.from('product_variants').select('id, label, sku_suffix, price_adjustment, stock_qty').eq('product_id', p.id).eq('is_active', true).order('created_at'),
  ]);

  const s = store.data as { id: string; store_name: string | null; store_slug: string | null } | null;
  const sup = supplier.data as { business_name?: string; is_verified?: boolean } | null;
  const cat = category.data as { id: string; name: string; slug: string } | null;
  const variants = variantsRes.error
    ? []
    : ((variantsRes.data ?? []) as { id: string; label: string; sku_suffix: string | null; price_adjustment: number | string; stock_qty: number }[]).map((v) => ({
        id: v.id,
        label: v.label,
        skuSuffix: v.sku_suffix ?? '',
        priceAdjustment: Number(v.price_adjustment),
        stockQty: v.stock_qty,
      }));

  return {
    id: row.id,
    productId: p.id,
    name: p.name,
    description: (row.custom_description || p.description || '').trim(),
    images: (p.images ?? []).filter(Boolean),
    sku: p.sku ?? '',
    specs: cleanSpecs(p.specs),
    price: Number(row.custom_price),
    suggestedPrice: Number(p.suggested_price),
    stockQty: p.stock_qty,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    supplier: { id: p.supplier_id, name: sup?.business_name ?? '', verified: sup?.is_verified === true },
    store: { id: row.dropshipper_id, name: s?.store_name ?? '', slug: s?.store_slug ?? '' },
    category: cat,
    variants,
  };
}

export interface StoreMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
}

/** Store profile by slug: null if it truly doesn't exist, undefined if we couldn't tell. */
export async function getStoreMeta(slug: string): Promise<StoreMeta | null | undefined> {
  const sb = publicClient();
  if (!sb) return undefined;
  const { data, error } = await sb.from('dropshipper_profiles').select('*').eq('store_slug', slug).maybeSingle();
  if (error) return undefined;
  if (!data) return null;
  const d = data as { id: string; store_name: string | null; business_name: string; store_slug: string; description: string | null; logo_url: string | null };
  return { id: d.id, name: d.store_name || d.business_name, slug: d.store_slug, description: d.description ?? '', logoUrl: d.logo_url ?? '' };
}

export interface SitemapEntry {
  path: string;
  lastModified: string;
}

/** Published products and stores for the sitemap. Returns empty lists if the database can't be reached. */
export async function getSitemapEntries(): Promise<{ products: SitemapEntry[]; stores: SitemapEntry[] }> {
  const sb = publicClient();
  if (!sb) return { products: [], stores: [] };
  try {
    const [prods, stores] = await Promise.all([
      sb.from('dropshipper_products').select('id, updated_at, products(is_active)').eq('is_published', true).order('updated_at', { ascending: false }).limit(5000),
      sb.from('dropshipper_profiles').select('store_slug, updated_at').not('store_slug', 'is', null).limit(2000),
    ]);
    const products = ((prods.data ?? []) as unknown as { id: string; updated_at: string; products: { is_active: boolean } | null }[])
      .filter((r) => r.products && r.products.is_active !== false)
      .map((r) => ({ path: `/product/${r.id}`, lastModified: r.updated_at }));
    const storeEntries = ((stores.data ?? []) as { store_slug: string | null; updated_at: string }[])
      .filter((r) => r.store_slug)
      .map((r) => ({ path: `/store/${r.store_slug}`, lastModified: r.updated_at }));
    return { products, stores: storeEntries };
  } catch {
    return { products: [], stores: [] };
  }
}
