import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';

export type UserRole = 'customer' | 'dropshipper' | 'supplier' | 'admin' | 'developer';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'admin' | 'supplier' | 'dropshipper' | 'customer';
  avatarUrl: string;
  isVerified: boolean;
  createdAt: string;
}

export interface SupplierProfile {
  id: string;
  userId: string;
  businessName: string;
  businessRegNumber: string;
  region: string;
  description: string;
  isApproved: boolean;
  rating: number;
  createdAt: string;
}

export interface DropshipperProfile {
  id: string;
  userId: string;
  businessName: string;
  storeName: string;
  storeSlug: string;
  commissionRate: number;
  // Storefront customization
  themeColor: string;
  bannerUrl: string;
  tagline: string;
  announcement: string;
  whatsapp: string;
  socialLinks: Record<string, string>;
  featuredProductIds: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

export interface ProductVariant {
  id: string;
  label: string; // e.g. "Red / Large"
  skuSuffix: string; // appended to the parent product's SKU, e.g. "-RED-L"
  priceAdjustment: number; // added to costPrice/suggestedPrice; can be negative
  stockQty: number;
}

export interface Product {
  id: string;
  supplierId: string;
  supplierName: string;
  categoryId: string;
  name: string;
  description: string;
  images: string[];
  costPrice: number;
  suggestedPrice: number;
  stockQty: number;
  sku: string;
  isActive: boolean;
  createdAt: string;
  reviews: ProductReview[];
  variants: ProductVariant[];
}

export interface DropshipperProduct {
  id: string;
  dropshipperId: string;
  productId: string;
  product: Product;
  sellingPrice: number;
  customDescription: string;
  isPublished: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number; // what the customer paid
  costPrice: number; // what the supplier charges
  supplierId?: string; // which supplier fulfills this line (an order can span suppliers)
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  dropshipperId: string;
  dropshipperStoreName: string;
  supplierId: string;
  supplierBusinessName: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  platformFee: number; // the platform's cut, already included in totalAmount
  profitAmount: number; // (sellingPrice - costPrice) * quantity
  costAmount: number; // costPrice * quantity
  deliveryAddress: {
    fullName: string;
    phone: string;
    region: string;
    city: string;
    ghanaPostGps: string;
  };
  items: OrderItem[];
  estimatedDelivery?: string | null;
  notes?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
}

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'credit' | 'debit' | 'withdrawal' | 'refund';
  description: string;
  reference: string;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  type: 'sms' | 'email' | 'whatsapp';
  recipient: string;
  message: string;
  timestamp: string;
}

interface AppState {
  // Active state
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  mobilePreview: boolean;
  setMobilePreview: (active: boolean) => void;

   // Current signed-in user (resolved from Supabase Auth; null when logged out)
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;

  // Dropshipper profile for the current user (null when not a dropshipper)
  dropshipperProfile: DropshipperProfile | null;
  setDropshipperProfile: (profile: DropshipperProfile | null) => void;

  // Supplier profile for the current user (null when not a supplier, or pending setup)
  supplierProfile: SupplierProfile | null;
  setSupplierProfile: (profile: SupplierProfile | null) => void;

  // Data hydration from Supabase
  hydrated: boolean;
  hydrate: () => Promise<void>;

  // Promo Codes (loaded from backend; no hardcoded discounts)
  promoCodes: Record<string, number>;
  appliedPromo: { code: string; discount: number } | null;
  applyPromoCode: (code: string) => boolean;
  clearPromo: () => void;

  // Data Tables (hydrated from Supabase)
  users: User[];
  supplierProfiles: SupplierProfile[];
  dropshipperProfiles: DropshipperProfile[];
  categories: Category[];
  products: Product[];
  dropshipperProducts: DropshipperProduct[];
  orders: Order[];
  wallets: Record<string, Wallet>; // key: userId
  transactions: Transaction[];
  notifications: NotificationLog[];

  // Cart State (Customer side)
  cart: {
    dropshipperProductId: string; // the imported item
    variantId?: string;
    variantLabel?: string;
    quantity: number;
  }[];

  // Actions
  addToCart: (dropshipperProductId: string, variant?: { id: string; label: string }) => void;
  removeFromCart: (dropshipperProductId: string, variantId?: string) => void;
  updateCartQuantity: (dropshipperProductId: string, qty: number, variantId?: string) => void;
  clearCart: () => void;

  // Supplier Actions
  /** Create or update the current user's supplier profile (application for approval). */
  submitSupplierProfile: (payload: {
    businessName: string;
    businessRegNumber: string;
    region: string;
    description: string;
  }) => Promise<{ error: string | null }>;
  addSupplierProduct: (productData: Omit<Product, 'id' | 'supplierId' | 'supplierName' | 'createdAt'>) => void;
  addSupplierProductsBulk: (rows: Omit<Product, 'id' | 'supplierId' | 'supplierName' | 'createdAt' | 'reviews' | 'variants'>[]) => number;
  updateSupplierProductStock: (productId: string, newQty: number) => void;
  updateVariantStock: (productId: string, variantId: string, newQty: number) => void;
  fulfillOrder: (orderId: string) => Promise<void>;
  shipOrder: (orderId: string) => Promise<void>;

  // Review Actions
  addProductReview: (productId: string, review: { author: string; rating: number; comment: string }) => void;

  // Dropshipper Actions
  importProductToStore: (productId: string, sellingPrice: number, desc?: string) => void;
  togglePublishProduct: (dropshipperProductId: string) => void;
  updateImportedPrice: (dropshipperProductId: string, price: number) => void;
  removeImportedProduct: (dropshipperProductId: string) => void;
  withdrawFunds: (userId: string, amount: number, details: string) => Promise<boolean>;

  // Customer Actions
  /** Places an order against a single dropshipper's store (e.g. from a storefront cart). */
  submitOrder: (payload: {
    dropshipperId: string;
    items: Array<{ productId: string; quantity: number }>;
    fullName: string;
    phone: string;
    region: string;
    city: string;
    ghanaPostGps: string;
    notes?: string;
  }) => Promise<{ success: boolean; orderNumber?: string; error?: string }>;
  /** Places orders from the marketplace-wide cart, splitting by dropshipper as needed. */
  submitCheckout: (checkoutData: {
    fullName: string;
    phone: string;
    region: string;
    city: string;
    ghanaPostGps: string;
    paymentProvider: 'mtn_momo' | 'vodafone_cash' | 'airteltigo' | 'bank_card';
    momoNumber: string;
    notes?: string;
  }) => Promise<{ success: boolean; orderNumber?: string; error?: string }>;

  // Admin Actions
  setSupplierApproval: (supplierProfileId: string, approved: boolean) => void;
  approveSupplier: (supplierProfileId: string) => void;
}

// ── DB row → store type mappers (snake_case → camelCase) ─────────────────────

interface ProductDbRow {
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
}

function mapProductRow(p: ProductDbRow): Product {
  return {
    id: p.id,
    supplierId: p.supplier_id,
    supplierName: p.supplier_profiles?.business_name ?? '',
    categoryId: p.category_id,
    name: p.name,
    description: p.description,
    images: p.images ?? [],
    costPrice: Number(p.cost_price),
    suggestedPrice: Number(p.suggested_price),
    stockQty: p.stock_qty,
    sku: p.sku,
    isActive: p.is_active,
    createdAt: p.created_at,
    reviews: [],
    variants: [],
  };
}

interface SupplierProfileDbRow {
  id: string;
  business_name: string;
  business_reg_number: string | null;
  region: string | null;
  description: string | null;
  is_approved: boolean;
  rating: number | null;
  created_at: string;
}

function mapSupplierProfileRow(row: SupplierProfileDbRow): SupplierProfile {
  return {
    id: row.id,
    userId: row.id,
    businessName: row.business_name,
    businessRegNumber: row.business_reg_number ?? '',
    region: row.region ?? '',
    description: row.description ?? '',
    isApproved: row.is_approved,
    rating: Number(row.rating ?? 0),
    createdAt: row.created_at,
  };
}

interface DropshipperProfileDbRow {
  id: string;
  business_name: string;
  store_name: string | null;
  store_slug: string | null;
  commission_rate: number | null;
  theme_color: string | null;
  banner_url: string | null;
  tagline: string | null;
  announcement: string | null;
  whatsapp: string | null;
  social_links: Record<string, string> | null;
  featured_product_ids: string[] | null;
  created_at: string;
}

function mapDropshipperProfileRow(dp: DropshipperProfileDbRow): DropshipperProfile {
  return {
    id: dp.id,
    userId: dp.id,
    businessName: dp.business_name ?? '',
    storeName: dp.store_name ?? '',
    storeSlug: dp.store_slug ?? '',
    commissionRate: Number(dp.commission_rate ?? 0),
    themeColor: dp.theme_color ?? '#f04438',
    bannerUrl: dp.banner_url ?? '',
    tagline: dp.tagline ?? '',
    announcement: dp.announcement ?? '',
    whatsapp: dp.whatsapp ?? '',
    socialLinks: dp.social_links ?? {},
    featuredProductIds: dp.featured_product_ids ?? [],
    createdAt: dp.created_at,
  };
}

interface UserDbRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: User['role'];
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

function mapUserRow(row: UserDbRow): User {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    fullName: row.full_name,
    role: row.role,
    avatarUrl: row.avatar_url ?? '',
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

interface OrderItemDbRow {
  id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products?: {
    name: string;
    cost_price: number;
    supplier_id: string;
    supplier_profiles?: { business_name: string } | null;
  } | null;
}

interface OrderDbRow {
  id: string;
  order_number: string | null;
  dropshipper_id: string;
  customer_name: string;
  customer_phone: string;
  customer_region: string | null;
  customer_city: string | null;
  customer_ghana_post_gps: string | null;
  status: Order['status'];
  total: number;
  platform_fee: number;
  estimated_delivery: string | null;
  notes: string | null;
  created_at: string;
  dropshipper_profiles?: { store_name: string | null } | null;
  order_items?: OrderItemDbRow[];
}

function mapOrderRow(row: OrderDbRow): Order {
  const items = row.order_items ?? [];
  const first = items[0];
  const profitAmount = items.reduce(
    (sum, it) => sum + (Number(it.unit_price) - Number(it.products?.cost_price ?? 0)) * it.quantity,
    0,
  );
  const costAmount = items.reduce((sum, it) => sum + Number(it.products?.cost_price ?? 0) * it.quantity, 0);

  return {
    id: row.id,
    orderNumber: row.order_number ?? row.id.slice(0, 8).toUpperCase(),
    customerId: '',
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    dropshipperId: row.dropshipper_id,
    dropshipperStoreName: row.dropshipper_profiles?.store_name ?? '',
    supplierId: first?.products?.supplier_id ?? '',
    supplierBusinessName: first?.products?.supplier_profiles?.business_name ?? '',
    status: row.status,
    totalAmount: Number(row.total),
    platformFee: Number(row.platform_fee ?? 0),
    profitAmount,
    costAmount,
    estimatedDelivery: row.estimated_delivery ?? undefined,
    deliveryAddress: {
      fullName: row.customer_name,
      phone: row.customer_phone,
      region: row.customer_region ?? '',
      city: row.customer_city ?? '',
      ghanaPostGps: row.customer_ghana_post_gps ?? '',
    },
    items: items.map((it) => ({
      id: it.id,
      productId: it.product_id ?? '',
      productName: it.products?.name ?? 'Product',
      quantity: it.quantity,
      unitPrice: Number(it.unit_price),
      costPrice: Number(it.products?.cost_price ?? 0),
      supplierId: it.products?.supplier_id,
    })),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

// ── Dev seed: appears when Supabase has no products ─────────────

const SEED_PRODUCTS: Product[] = [
  {
    id: 'seed-product-1',
    supplierId: 'seed-supplier-1',
    supplierName: 'Bhra Joe Store',
    categoryId: 'cat-1',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    description: 'Latest Samsung Galaxy S24 Ultra with 256GB storage, titanium design, and advanced camera system. Black, brand new, sealed.',
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=90',
    ],
    costPrice: 850,
    suggestedPrice: 1200,
    stockQty: 15,
    sku: 'SGS24U-256-BLK',
    isActive: true,
    createdAt: new Date().toISOString(),
    reviews: [],
    variants: [],
  },
  {
    id: 'seed-product-2',
    supplierId: 'seed-supplier-1',
    supplierName: 'Bhra Joe Store',
    categoryId: 'cat-2',
    name: "Women's Ankara Wrap Dress",
    description: 'Beautiful Ankara print wrap dress for women. Vibrant colors, comfortable fit. Perfect for special occasions.',
    images: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=90',
    ],
    costPrice: 120,
    suggestedPrice: 280,
    stockQty: 20,
    sku: 'AADRESS-M',
    isActive: true,
    createdAt: new Date().toISOString(),
    reviews: [],
    variants: [],
  },
];

const SEED_DROPSHIPPER_PRODUCTS: DropshipperProduct[] = [
  {
    id: 'seed-dp-1',
    dropshipperId: '27b5287a-46b8-4fd8-b5f2-8c2a1a7ded67',
    productId: SEED_PRODUCTS[0].id,
    product: SEED_PRODUCTS[0],
    sellingPrice: 1099,
    customDescription: 'Express delivery within 24 hours. Pay via MTN MoMo on delivery.',
    isPublished: true,
  },
  {
    id: 'seed-dp-2',
    dropshipperId: '27b5287a-46b8-4fd8-b5f2-8c2a1a7ded67',
    productId: SEED_PRODUCTS[1].id,
    product: SEED_PRODUCTS[1],
    sellingPrice: 249,
    customDescription: 'Free delivery within Accra. Pay via MTN MoMo on delivery.',
    isPublished: true,
  },
];

export const useGlobalStore = create<AppState>((set, get) => ({
  activeRole: 'customer',
  setActiveRole: (role) => set({ activeRole: role }),
  mobilePreview: false,
  setMobilePreview: (active) => set({ mobilePreview: active }),

  currentUserId: null,
  setCurrentUserId: (id) => set({ currentUserId: id }),

  dropshipperProfile: null,
  setDropshipperProfile: (profile) => set({ dropshipperProfile: profile }),

  supplierProfile: null,
  setSupplierProfile: (profile) => set({ supplierProfile: profile }),

  hydrated: false,
  hydrate: async () => {
    const uid = get().currentUserId;
    try {
      const [catsRes, prodsRes, supplierProfilesRes, dropshipperProfilesRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('products')
          .select('*, supplier_profiles(business_name)')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        // Public (RLS-readable by anyone) so the admin approvals queue and each
        // supplier's own status can both be derived from one fetch.
        supabase.from('supplier_profiles').select('*').order('created_at', { ascending: false }),
        // Also public — powers an admin directory of every storefront.
        supabase.from('dropshipper_profiles').select('*').order('created_at', { ascending: false }),
      ]);

      const categories: Category[] = (catsRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
      }));

      const products: Product[] = (prodsRes.data ?? []).map((p) =>
        mapProductRow(p as ProductDbRow),
      );

      if (products.length === 0) {
        products.push(...SEED_PRODUCTS);
      }

      const supplierProfiles: SupplierProfile[] = (supplierProfilesRes.data ?? []).map((sp) =>
        mapSupplierProfileRow(sp as SupplierProfileDbRow),
      );
      const supplierProfile = uid ? supplierProfiles.find((sp) => sp.id === uid) ?? null : null;

      const dropshipperProfiles: DropshipperProfile[] = (dropshipperProfilesRes.data ?? []).map((dp) =>
        mapDropshipperProfileRow(dp as DropshipperProfileDbRow),
      );
      const dropshipperProfile = uid ? dropshipperProfiles.find((dp) => dp.id === uid) ?? null : null;

      let dropshipperProducts: DropshipperProduct[] = [];
      let wallets: Record<string, Wallet> = {};
      let transactions: Transaction[] = [];
      let orders: Order[] = [];
      let users: User[] = [];

      if (uid) {
        const [dpsRes, walletRes, txRes, ordersRes, usersRes] = await Promise.all([
          supabase
            .from('dropshipper_products')
            .select('*, products(*, supplier_profiles(business_name))')
            .eq('dropshipper_id', uid)
            .order('created_at', { ascending: false }),
          supabase.from('wallets').select('*').eq('user_id', uid).maybeSingle(),
          supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(50),
          // RLS scopes this to: orders the caller placed as a dropshipper, orders
          // containing a product the caller supplies, or (if admin) everything.
          supabase
            .from('orders')
            .select('*, dropshipper_profiles(store_name), order_items(*, products(name, cost_price, supplier_id, supplier_profiles(business_name)))')
            .order('created_at', { ascending: false })
            .limit(200),
          // RLS ("users read own profile") only actually returns rows beyond the
          // caller's own for an admin — harmless empty result for everyone else.
          supabase.from('users').select('*').order('created_at', { ascending: false }).limit(500),
        ]);

        dropshipperProducts = (dpsRes.data ?? [])
          .filter((d) => d.products)
          .map((d) => ({
            id: d.id,
            dropshipperId: d.dropshipper_id,
            productId: d.product_id,
            product: mapProductRow(d.products as ProductDbRow),
            sellingPrice: Number(d.custom_price),
            customDescription: d.custom_description ?? (d.products as ProductDbRow).description,
            isPublished: d.is_published,
          }));

        const w = walletRes.data;
        wallets = {
          [uid]: {
            id: w?.id ?? `wallet-${uid}`,
            userId: uid,
            balance: Number(w?.balance ?? 0),
            totalEarned: Number(w?.total_earned ?? 0),
          },
        };

        transactions = (txRes.data ?? []).map((t) => ({
          id: t.id,
          walletId: t.user_id,
          amount: Number(t.amount),
          type: (t.type === 'commission' ? 'credit' : t.type) as Transaction['type'],
          description: t.description,
          reference: t.reference ?? '',
          createdAt: t.created_at,
        }));

        orders = (ordersRes.data ?? []).map((o) => mapOrderRow(o as OrderDbRow));
        users = (usersRes.data ?? []).map((u) => mapUserRow(u as UserDbRow));
      }

      if (dropshipperProducts.length === 0) {
        dropshipperProducts = SEED_DROPSHIPPER_PRODUCTS;
      }

      set({
        categories,
        products,
        dropshipperProducts,
        dropshipperProfile,
        dropshipperProfiles,
        supplierProfiles,
        supplierProfile,
        wallets,
        transactions,
        orders,
        users,
        hydrated: true,
      });
    } catch {
      // Surface an empty (not fake) state if Supabase is unreachable.
      set({ hydrated: true });
    }
  },

  // Promo Codes — loaded from backend; empty until a promotions source exists.
  promoCodes: {},
  appliedPromo: null,
  applyPromoCode: (code) => {
    const state = get();
    const discount = state.promoCodes[code.toUpperCase()];
    if (discount !== undefined) {
      set({ appliedPromo: { code: code.toUpperCase(), discount } });
      return true;
    }
    return false;
  },
  clearPromo: () => set({ appliedPromo: null }),

  users: [],
  supplierProfiles: [],
  dropshipperProfiles: [],
  categories: [],
  products: [],
  dropshipperProducts: [],
  orders: [],
  wallets: {},
  transactions: [],
  notifications: [],
  cart: [],

  // Cart operations
  addToCart: (dropshipperProductId, variant) => set((state) => {
    const existing = state.cart.find(
      (item) => item.dropshipperProductId === dropshipperProductId && item.variantId === variant?.id,
    );
    if (existing) {
      return {
        cart: state.cart.map(item =>
          item.dropshipperProductId === dropshipperProductId && item.variantId === variant?.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      };
    }
    return {
      cart: [
        ...state.cart,
        { dropshipperProductId, variantId: variant?.id, variantLabel: variant?.label, quantity: 1 },
      ],
    };
  }),

  removeFromCart: (dropshipperProductId, variantId) => set((state) => ({
    cart: state.cart.filter(
      item => !(item.dropshipperProductId === dropshipperProductId && item.variantId === variantId)
    )
  })),

  updateCartQuantity: (dropshipperProductId, qty, variantId) => set((state) => ({
    cart: state.cart.map(item =>
      item.dropshipperProductId === dropshipperProductId && item.variantId === variantId
        ? { ...item, quantity: Math.max(1, qty) }
        : item
    )
  })),

  clearCart: () => set({ cart: [] }),

  submitSupplierProfile: async (payload) => {
    const uid = get().currentUserId;
    if (!uid) return { error: 'You must be signed in.' };

    const { data, error } = await supabase
      .from('supplier_profiles')
      .upsert(
        {
          id: uid,
          business_name: payload.businessName,
          business_reg_number: payload.businessRegNumber,
          region: payload.region,
          description: payload.description,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single();

    if (error) return { error: error.message };

    set({ supplierProfile: mapSupplierProfileRow(data as SupplierProfileDbRow) });
    set((s) => ({
      supplierProfiles: [
        ...s.supplierProfiles.filter((sp) => sp.id !== uid),
        mapSupplierProfileRow(data as SupplierProfileDbRow),
      ],
    }));
    return { error: null };
  },

  addSupplierProduct: (productData) => {
    const state = get();
    const uid = state.currentUserId;
    if (!uid) return;
    const supplierName = state.supplierProfiles.find((s) => s.userId === uid)?.businessName ?? '';

    const tempId = `local-${Date.now()}`;
    const optimistic: Product = {
      ...productData,
      id: tempId,
      supplierId: uid,
      supplierName,
      createdAt: new Date().toISOString(),
    };
    set({ products: [optimistic, ...state.products] });

    supabase
      .from('products')
      .insert({
        supplier_id: uid,
        category_id: productData.categoryId || null,
        name: productData.name,
        description: productData.description,
        images: productData.images,
        cost_price: productData.costPrice,
        suggested_price: productData.suggestedPrice,
        stock_qty: productData.stockQty,
        sku: productData.sku,
        is_active: productData.isActive,
      })
      .select('id')
      .single()
      .then(({ data, error }) => {
        if (error) {
          set((s) => ({ products: s.products.filter((p) => p.id !== tempId) }));
          console.error('Failed to save product:', error.message);
          return;
        }
        set((s) => ({
          products: s.products.map((p) => (p.id === tempId ? { ...p, id: data.id } : p)),
        }));
      });
  },

  addSupplierProductsBulk: (rows) => {
    const state = get();
    const uid = state.currentUserId;
    if (!uid || rows.length === 0) return 0;
    const supplierName = state.supplierProfiles.find((s) => s.userId === uid)?.businessName ?? '';
    const now = Date.now();
    const tempIds = rows.map((_, idx) => `local-${now}-${idx}`);
    const newProducts: Product[] = rows.map((row, idx) => ({
      ...row,
      id: tempIds[idx],
      supplierId: uid,
      supplierName,
      createdAt: new Date().toISOString(),
      reviews: [],
      variants: [],
    }));
    set({ products: [...newProducts, ...state.products] });

    supabase
      .from('products')
      .insert(
        rows.map((row) => ({
          supplier_id: uid,
          category_id: row.categoryId || null,
          name: row.name,
          description: row.description,
          images: row.images,
          cost_price: row.costPrice,
          suggested_price: row.suggestedPrice,
          stock_qty: row.stockQty,
          sku: row.sku,
          is_active: row.isActive,
        })),
      )
      .select('id')
      .then(({ data, error }) => {
        if (error) {
          set((s) => ({ products: s.products.filter((p) => !tempIds.includes(p.id)) }));
          console.error('Failed to save bulk products:', error.message);
          return;
        }
        set((s) => ({
          products: s.products.map((p) => {
            const idx = tempIds.indexOf(p.id);
            return idx !== -1 && data[idx] ? { ...p, id: data[idx].id } : p;
          }),
        }));
      });

    return newProducts.length;
  },

  updateSupplierProductStock: (productId, newQty) => {
    const state = get();
    const previous = state.products.find((p) => p.id === productId)?.stockQty;

    set({
      products: state.products.map((p) => (p.id === productId ? { ...p, stockQty: newQty } : p)),
    });

    supabase
      .from('products')
      .update({ stock_qty: newQty, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .then(({ error }) => {
        if (error && previous !== undefined) {
          set((s) => ({
            products: s.products.map((p) => (p.id === productId ? { ...p, stockQty: previous } : p)),
          }));
          console.error('Failed to update stock:', error.message);
        }
      });
  },

  updateVariantStock: (productId, variantId, newQty) => set((state) => ({
    products: state.products.map(p =>
      p.id === productId
        ? { ...p, variants: p.variants.map(v => v.id === variantId ? { ...v, stockQty: newQty } : v) }
        : p
    )
  })),

  importProductToStore: (productId, sellingPrice, desc) => {
    const state = get();
    const uid = state.currentUserId;
    if (!uid) return;
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;
    const exists = state.dropshipperProducts.find(
      (dp) => dp.productId === productId && dp.dropshipperId === uid,
    );
    if (exists) return;

    const customDescription = desc || product.description;

    // Optimistic local entry so the UI updates immediately.
    const tempId = `local-${Date.now()}`;
    const optimistic: DropshipperProduct = {
      id: tempId,
      dropshipperId: uid,
      productId,
      product,
      sellingPrice,
      customDescription,
      isPublished: true,
    };
    set({ dropshipperProducts: [...state.dropshipperProducts, optimistic] });

    supabase
      .from('dropshipper_products')
      .insert({
        dropshipper_id: uid,
        product_id: productId,
        custom_price: sellingPrice,
        custom_description: customDescription,
        is_published: true,
      })
      .select('id')
      .single()
      .then(({ data, error }) => {
        if (error) {
          // Roll back the optimistic entry on failure.
          set((s) => ({ dropshipperProducts: s.dropshipperProducts.filter((dp) => dp.id !== tempId) }));
          console.error('Failed to import product to store:', error.message);
          return;
        }
        // Replace the temp id with the real database id.
        set((s) => ({
          dropshipperProducts: s.dropshipperProducts.map((dp) =>
            dp.id === tempId ? { ...dp, id: data.id } : dp,
          ),
        }));
      });
  },

  togglePublishProduct: (dropshipperProductId) => {
    const state = get();
    const current = state.dropshipperProducts.find((dp) => dp.id === dropshipperProductId);
    if (!current) return;
    const nextPublished = !current.isPublished;

    set({
      dropshipperProducts: state.dropshipperProducts.map((dp) =>
        dp.id === dropshipperProductId ? { ...dp, isPublished: nextPublished } : dp
      ),
    });

    supabase
      .from('dropshipper_products')
      .update({ is_published: nextPublished, updated_at: new Date().toISOString() })
      .eq('id', dropshipperProductId)
      .then(({ error }) => {
        if (error) {
          // Roll back on failure.
          set((s) => ({
            dropshipperProducts: s.dropshipperProducts.map((dp) =>
              dp.id === dropshipperProductId ? { ...dp, isPublished: !nextPublished } : dp
            ),
          }));
          console.error('Failed to update publish status:', error.message);
        }
      });
  },

  updateImportedPrice: (dropshipperProductId, price) => {
    const state = get();
    const previous = state.dropshipperProducts.find((dp) => dp.id === dropshipperProductId)?.sellingPrice;

    set({
      dropshipperProducts: state.dropshipperProducts.map((dp) =>
        dp.id === dropshipperProductId ? { ...dp, sellingPrice: price } : dp
      ),
    });

    supabase
      .from('dropshipper_products')
      .update({ custom_price: price, updated_at: new Date().toISOString() })
      .eq('id', dropshipperProductId)
      .then(({ error }) => {
        if (error && previous !== undefined) {
          set((s) => ({
            dropshipperProducts: s.dropshipperProducts.map((dp) =>
              dp.id === dropshipperProductId ? { ...dp, sellingPrice: previous } : dp
            ),
          }));
          console.error('Failed to update price:', error.message);
        }
      });
  },

  removeImportedProduct: (dropshipperProductId) => {
    const state = get();
    const removed = state.dropshipperProducts.find((dp) => dp.id === dropshipperProductId);

    set({
      dropshipperProducts: state.dropshipperProducts.filter((dp) => dp.id !== dropshipperProductId),
    });

    supabase
      .from('dropshipper_products')
      .delete()
      .eq('id', dropshipperProductId)
      .then(({ error }) => {
        if (error && removed) {
          // Roll back — re-add the item if the delete failed server-side.
          set((s) => ({ dropshipperProducts: [...s.dropshipperProducts, removed] }));
          console.error('Failed to remove product:', error.message);
        }
      });
  },

  addProductReview: (productId, review) => {
    const rating = Math.max(1, Math.min(5, Math.round(review.rating)));
    const newReview: ProductReview = {
      id: `local-rev-${Date.now()}`,
      author: review.author.trim() || 'Anonymous',
      rating,
      comment: review.comment.trim(),
      date: new Date().toISOString(),
    };
    set((state) => ({
      products: state.products.map(p =>
        p.id === productId ? { ...p, reviews: [newReview, ...p.reviews] } : p
      ),
      dropshipperProducts: state.dropshipperProducts.map(dp =>
        dp.productId === productId
          ? { ...dp, product: { ...dp.product, reviews: [newReview, ...dp.product.reviews] } }
          : dp
      ),
    }));
  },

  withdrawFunds: async (userId, amount, details) => {
    const state = get();
    const wallet = state.wallets[userId];
    if (!wallet || wallet.balance < amount || amount <= 0) return false;

    const { data: newBalance, error } = await supabase.rpc('wallet_withdraw', {
      p_amount: amount,
      p_account: { details },
    });

    if (error) {
      console.error('Withdrawal failed:', error.message);
      return false;
    }

    set((s) => ({
      wallets: {
        ...s.wallets,
        [userId]: { ...s.wallets[userId], balance: Number(newBalance) },
      },
    }));
    // Refresh the transaction history so the new withdrawal shows up.
    void get().hydrate();
    return true;
  },

  /** Places an order against a single dropshipper's store; used by storefront checkouts. */
  submitOrder: async (payload) => {
    const uid = get().currentUserId;
    if (!uid) return { success: false, error: 'Please sign in to place an order.' };
    if (payload.items.length === 0) return { success: false, error: 'Your cart is empty.' };

    const { data, error } = await supabase.rpc('create_order', {
      p_dropshipper_id: payload.dropshipperId,
      p_customer_name: payload.fullName,
      p_customer_phone: payload.phone,
      p_customer_city: payload.city,
      p_customer_ghana_post_gps: payload.ghanaPostGps,
      p_customer_region: payload.region,
      p_items: payload.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      p_notes: payload.notes || null,
    });

    if (error) return { success: false, error: error.message };

    void get().hydrate();
    return { success: true, orderNumber: (data as { order_number?: string } | null)?.order_number };
  },

  submitCheckout: async (checkoutData) => {
    const state = get();
    if (state.cart.length === 0) return { success: false, error: 'Your cart is empty.' };
    const uid = state.currentUserId;
    if (!uid) return { success: false, error: 'Please sign in to place an order.' };

    // The catalog-wide cart can span multiple dropshippers' stores; split into
    // one create_order call per dropshipper since each order has one owner.
    const byDropshipper = new Map<string, Array<{ productId: string; quantity: number }>>();
    for (const cartItem of state.cart) {
      const dp = state.dropshipperProducts.find((d) => d.id === cartItem.dropshipperProductId);
      if (!dp) continue;
      const items = byDropshipper.get(dp.dropshipperId) ?? [];
      items.push({ productId: dp.productId, quantity: cartItem.quantity });
      byDropshipper.set(dp.dropshipperId, items);
    }

    if (byDropshipper.size === 0) return { success: false, error: 'Your cart is empty.' };

    let firstOrderNumber: string | undefined;
    for (const [dropshipperId, items] of byDropshipper) {
      const { data, error } = await supabase.rpc('create_order', {
        p_dropshipper_id: dropshipperId,
        p_customer_name: checkoutData.fullName,
        p_customer_phone: checkoutData.phone,
        p_customer_city: checkoutData.city,
        p_customer_ghana_post_gps: checkoutData.ghanaPostGps,
        p_customer_region: checkoutData.region,
        p_items: items,
        p_notes: checkoutData.notes || null,
      });
      if (error) return { success: false, error: error.message };
      const orderNumber = (data as { order_number?: string } | null)?.order_number;
      firstOrderNumber = firstOrderNumber ?? orderNumber;
    }

    set({ cart: [] });
    void get().hydrate();
    return { success: true, orderNumber: firstOrderNumber };
  },

  // Fulfill orders
  fulfillOrder: async (orderId) => {
    const { error } = await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: 'processing' });
    if (error) { console.error('Failed to acknowledge order:', error.message); return; }
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: 'processing' } : o)),
    }));
  },

  shipOrder: async (orderId) => {
    const { error } = await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: 'shipped' });
    if (error) { console.error('Failed to ship order:', error.message); return; }
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: 'shipped' } : o)),
    }));
    // Shipping triggers commission/payout crediting server-side — refresh wallets.
    void get().hydrate();
  },

  // Admin approves or revokes a supplier's ability to sell
  setSupplierApproval: (supplierProfileId, approved) => {
    const state = get();
    const previous = state.supplierProfiles.find((p) => p.id === supplierProfileId)?.isApproved;

    set({
      supplierProfiles: state.supplierProfiles.map((p) =>
        p.id === supplierProfileId ? { ...p, isApproved: approved } : p
      ),
      supplierProfile:
        state.supplierProfile?.id === supplierProfileId
          ? { ...state.supplierProfile, isApproved: approved }
          : state.supplierProfile,
    });

    supabase
      .from('supplier_profiles')
      .update({ is_approved: approved, updated_at: new Date().toISOString() })
      .eq('id', supplierProfileId)
      .then(({ error }) => {
        if (error && previous !== undefined) {
          set((s) => ({
            supplierProfiles: s.supplierProfiles.map((p) =>
              p.id === supplierProfileId ? { ...p, isApproved: previous } : p
            ),
            supplierProfile:
              s.supplierProfile?.id === supplierProfileId
                ? { ...s.supplierProfile, isApproved: previous }
                : s.supplierProfile,
          }));
          console.error('Failed to update supplier approval:', error.message);
        }
      });
  },

  approveSupplier: (supplierProfileId) => get().setSupplierApproval(supplierProfileId, true),
}));
