import type {
  DropshipperProduct,
  DropshipperStoreProfile,
  Product,
  Transaction,
  UserProfile,
  WalletBalance,
} from '../api/types';

// ── Raw database rows (snake_case, as stored in Supabase) ───────────────────

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'customer' | 'dropshipper' | 'supplier' | 'admin';
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface ProductRow {
  id: string;
  supplier_id: string;
  category_id: string;
  name: string;
  description: string;
  images: string[] | null;
  cost_price: number;
  suggested_price: number;
  stock_qty: number;
  sku: string;
  is_active: boolean;
  created_at: string;
  supplier_profiles?: { business_name: string } | null;
  categories?: { slug: string } | null;
}

export interface DropshipperProductRow {
  id: string;
  dropshipper_id: string;
  product_id: string;
  custom_price: number;
  custom_description: string | null;
  is_published: boolean;
  created_at: string;
  products?: ProductRow | null;
}

export interface WalletRow {
  user_id: string;
  balance: number;
  total_earned: number | null;
  currency: 'GHS';
}

export interface DropshipperProfileRow {
  id: string;
  business_name: string;
  store_name: string | null;
  store_slug: string | null;
  description: string | null;
  logo_url: string | null;
  location: string | null;
  commission_rate: number;
  created_at: string;
  // Storefront customization
  theme_color: string;
  banner_url: string | null;
  tagline: string | null;
  announcement: string | null;
  whatsapp: string | null;
  social_links: Record<string, string> | null;
  featured_product_ids: string[] | null;
}

export interface WalletTransactionRow {
  id: string;
  user_id: string;
  type: 'credit' | 'debit' | 'withdrawal' | 'refund' | 'commission';
  amount: number;
  description: string;
  reference: string | null;
  created_at: string;
}

// ── UI types not covered by lib/api/types ───────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

// ── Mappers: database row → camelCase UI type ───────────────────────────────

export function mapUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatarUrl: row.avatar_url ?? undefined,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

export function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, slug: row.slug, icon: row.icon };
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_profiles?.business_name ?? '',
    categoryId: row.category_id,
    categorySlug: row.categories?.slug ?? '',
    name: row.name,
    description: row.description,
    images: row.images ?? [],
    costPrice: Number(row.cost_price),
    suggestedPrice: Number(row.suggested_price),
    stockQty: row.stock_qty,
    sku: row.sku,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapDropshipperProduct(row: DropshipperProductRow): DropshipperProduct {
  return {
    id: row.id,
    dropshipperId: row.dropshipper_id,
    productId: row.product_id,
    product: row.products ? mapProduct(row.products) : (undefined as unknown as Product),
    sellingPrice: Number(row.custom_price),
    customDescription: row.custom_description ?? '',
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

export function mapWallet(row: WalletRow): WalletBalance {
  return {
    balance: Number(row.balance),
    totalEarned: Number(row.total_earned ?? 0),
    currency: row.currency ?? 'GHS',
  };
}

export function mapTransaction(row: WalletTransactionRow): Transaction {
  return {
    id: row.id,
    walletId: row.user_id,
    amount: Number(row.amount),
    type: (row.type === 'commission' ? 'credit' : row.type) as Transaction['type'],
    description: row.description,
    reference: row.reference ?? '',
    createdAt: row.created_at,
  };
}

export function mapDropshipperProfile(row: DropshipperProfileRow): DropshipperStoreProfile {
  return {
    id: row.id,
    businessName: row.business_name,
    storeName: row.store_name ?? '',
    storeSlug: row.store_slug ?? '',
    description: row.description ?? '',
    logoUrl: row.logo_url ?? undefined,
    location: row.location ?? undefined,
    commissionRate: Number(row.commission_rate ?? 0),
    createdAt: row.created_at,
    // Storefront customization
    themeColor: row.theme_color ?? '#f04438',
    bannerUrl: row.banner_url ?? undefined,
    tagline: row.tagline ?? undefined,
    announcement: row.announcement ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    socialLinks: (row.social_links as Record<string, string>) ?? {},
    featuredProductIds: row.featured_product_ids ?? [],
  };
}
