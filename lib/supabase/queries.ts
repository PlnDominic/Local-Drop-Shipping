import { supabase } from './client';
import {
  mapCategory,
  mapDropshipperProduct,
  mapDropshipperProfile,
  mapProduct,
  mapTransaction,
  mapWallet,
  type Category,
  type CategoryRow,
  type DropshipperProfileRow,
  type DropshipperProductRow,
  type ProductRow,
  type WalletRow,
  type WalletTransactionRow,
} from './types';
import type { DropshipperProduct, DropshipperStoreProfile, Product, Transaction, WalletBalance } from '../api/types';

const PRODUCT_SELECT =
  '*, supplier_profiles(business_name), categories(slug)';

// ── Catalog ─────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return (data as CategoryRow[]).map(mapCategory);
}

/** All active wholesale products (supplier catalog). */
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(mapProduct);
}

/** Products a supplier has listed. */
export async function getSupplierProducts(supplierId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ProductRow[]).map(mapProduct);
}

// ── Dropshipper storefront ────────────────────────────────────────────────────

/** Published storefront items (what customers browse on the marketplace). */
export async function getPublishedStoreProducts(): Promise<DropshipperProduct[]> {
  const { data, error } = await supabase
    .from('dropshipper_products')
    .select(`*, products(${PRODUCT_SELECT})`)
    .eq('is_published', true)
    .order('products(created_at)', { ascending: false });
  if (error) throw error;
  return (data as DropshipperProductRow[]).map(mapDropshipperProduct).filter((d) => d.product);
}

/** Items a specific dropshipper has imported into their store. */
export async function getDropshipperProducts(dropshipperId: string): Promise<DropshipperProduct[]> {
  const { data, error } = await supabase
    .from('dropshipper_products')
    .select(`*, products(${PRODUCT_SELECT})`)
    .eq('dropshipper_id', dropshipperId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DropshipperProductRow[]).map(mapDropshipperProduct).filter((d) => d.product);
}

/** Public storefront profile for a dropshipper, resolved by unique store_slug. */
export async function getDropshipperStoreBySlug(slug: string): Promise<DropshipperStoreProfile | null> {
  const { data, error } = await supabase
    .from('dropshipper_profiles')
    .select('*')
    .eq('store_slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDropshipperProfile(data as DropshipperProfileRow) : null;
}

/** Published storefront items for a single dropshipper (public browsing). */
export async function getPublishedDropshipperProducts(dropshipperId: string): Promise<DropshipperProduct[]> {
  const { data, error } = await supabase
    .from('dropshipper_products')
    .select(`*, products(${PRODUCT_SELECT})`)
    .eq('dropshipper_id', dropshipperId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DropshipperProductRow[]).map(mapDropshipperProduct).filter((d) => d.product);
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export async function getWallet(userId: string): Promise<WalletBalance> {
  const { data, error } = await supabase
    .from('wallets')
    .select('user_id, balance, total_earned, currency')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? mapWallet(data as WalletRow)
    : { balance: 0, totalEarned: 0, currency: 'GHS' };
}

export async function getTransactions(userId: string, limit = 20): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as WalletTransactionRow[]).map(mapTransaction);
}

// ── Storefront customization ──────────────────────────────────────────────────

export interface StoreCustomizationPayload {
  themeColor?: string;
  bannerUrl?: string | null;
  tagline?: string | null;
  announcement?: string | null;
  whatsapp?: string | null;
  socialLinks?: Record<string, string>;
  featuredProductIds?: string[];
}

/** Update the storefront customization fields for a dropshipper. */
export async function updateDropshipperStoreCustomization(
  dropshipperId: string,
  payload: StoreCustomizationPayload,
): Promise<DropshipperStoreProfile> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (payload.themeColor !== undefined) updates.theme_color = payload.themeColor;
  if (payload.bannerUrl !== undefined) updates.banner_url = payload.bannerUrl;
  if (payload.tagline !== undefined) updates.tagline = payload.tagline;
  if (payload.announcement !== undefined) updates.announcement = payload.announcement;
  if (payload.whatsapp !== undefined) updates.whatsapp = payload.whatsapp;
  if (payload.socialLinks !== undefined) updates.social_links = payload.socialLinks;
  if (payload.featuredProductIds !== undefined) updates.featured_product_ids = payload.featuredProductIds;

  const { data, error } = await supabase
    .from('dropshipper_profiles')
    .update(updates)
    .eq('id', dropshipperId)
    .select('*')
    .single();

  if (error) throw error;
  return mapDropshipperProfile(data as DropshipperProfileRow);
}
