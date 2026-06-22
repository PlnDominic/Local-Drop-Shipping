import { supabase } from './client';
import {
  mapCategory,
  mapDropshipperProduct,
  mapProduct,
  mapTransaction,
  mapWallet,
  type Category,
  type CategoryRow,
  type DropshipperProductRow,
  type ProductRow,
  type WalletRow,
  type WalletTransactionRow,
} from './types';
import type { DropshipperProduct, Product, Transaction, WalletBalance } from '../api/types';

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
    .order('created_at', { ascending: false });
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
