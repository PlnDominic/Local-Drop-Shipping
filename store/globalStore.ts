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
}

export interface SupplierProfile {
  id: string;
  userId: string;
  businessName: string;
  businessRegNumber: string;
  region: string;
  isApproved: boolean;
  rating: number;
}

export interface DropshipperProfile {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  commissionRate: number;
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
  quantity: number;
  unitPrice: number; // what the customer paid
  costPrice: number; // what the supplier charges
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

export interface Commission {
  id: string;
  orderId: string;
  orderNumber: string;
  dropshipperId: string;
  amount: number;
  status: 'pending' | 'paid';
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
  commissions: Commission[];
  notifications: NotificationLog[];

  // Cart State (Customer side)
  cart: {
    dropshipperProductId: string; // the imported item
    quantity: number;
  }[];

  // Actions
  addToCart: (dropshipperProductId: string) => void;
  removeFromCart: (dropshipperProductId: string) => void;
  updateCartQuantity: (dropshipperProductId: string, qty: number) => void;
  clearCart: () => void;

  // Supplier Actions
  addSupplierProduct: (productData: Omit<Product, 'id' | 'supplierId' | 'supplierName' | 'createdAt'>) => void;
  updateSupplierProductStock: (productId: string, newQty: number) => void;
  fulfillOrder: (orderId: string) => void;
  shipOrder: (orderId: string) => void;

  // Dropshipper Actions
  importProductToStore: (productId: string, sellingPrice: number, desc?: string) => void;
  togglePublishProduct: (dropshipperProductId: string) => void;
  updateImportedPrice: (dropshipperProductId: string, price: number) => void;
  removeImportedProduct: (dropshipperProductId: string) => void;
  withdrawFunds: (userId: string, amount: number, details: string) => boolean;

  // Customer Actions
  submitCheckout: (checkoutData: {
    fullName: string;
    phone: string;
    region: string;
    city: string;
    ghanaPostGps: string;
    paymentProvider: 'mtn_momo' | 'vodafone_cash' | 'airteltigo' | 'bank_card';
    momoNumber: string;
    notes?: string;
  }) => { success: boolean; orderNumber?: string };

  // Admin Actions
  approveSupplier: (supplierProfileId: string) => void;
  releaseCommission: (commissionId: string) => void;
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
  };
}

export const useGlobalStore = create<AppState>((set, get) => ({
  activeRole: 'customer',
  setActiveRole: (role) => set({ activeRole: role }),
  mobilePreview: false,
  setMobilePreview: (active) => set({ mobilePreview: active }),

  currentUserId: null,
  setCurrentUserId: (id) => set({ currentUserId: id }),

  hydrated: false,
  hydrate: async () => {
    const uid = get().currentUserId;
    try {
      const [catsRes, prodsRes, dpsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('products')
          .select('*, supplier_profiles(business_name)')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('dropshipper_products')
          .select('*, products(*, supplier_profiles(business_name))')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
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

      const dropshipperProducts: DropshipperProduct[] = (dpsRes.data ?? [])
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

      let wallets: Record<string, Wallet> = {};
      let transactions: Transaction[] = [];

      if (uid) {
        const [walletRes, txRes] = await Promise.all([
          supabase.from('wallets').select('*').eq('user_id', uid).maybeSingle(),
          supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

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
      }

      set({ categories, products, dropshipperProducts, wallets, transactions, hydrated: true });
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
  commissions: [],
  notifications: [],
  cart: [],

  // Cart operations
  addToCart: (dropshipperProductId) => set((state) => {
    const existing = state.cart.find(item => item.dropshipperProductId === dropshipperProductId);
    if (existing) {
      return {
        cart: state.cart.map(item =>
          item.dropshipperProductId === dropshipperProductId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      };
    }
    return { cart: [...state.cart, { dropshipperProductId, quantity: 1 }] };
  }),

  removeFromCart: (dropshipperProductId) => set((state) => ({
    cart: state.cart.filter(item => item.dropshipperProductId !== dropshipperProductId)
  })),

  updateCartQuantity: (dropshipperProductId, qty) => set((state) => ({
    cart: state.cart.map(item =>
      item.dropshipperProductId === dropshipperProductId
        ? { ...item, quantity: Math.max(1, qty) }
        : item
    )
  })),

  clearCart: () => set({ cart: [] }),

  addSupplierProduct: (productData) => set((state) => {
    const uid = state.currentUserId;
    if (!uid) return {};
    const supplierName = state.supplierProfiles.find((s) => s.userId === uid)?.businessName ?? '';
    const newProduct: Product = {
      ...productData,
      id: `local-${Date.now()}`,
      supplierId: uid,
      supplierName,
      createdAt: new Date().toISOString(),
    };
    return { products: [newProduct, ...state.products] };
  }),

  updateSupplierProductStock: (productId, newQty) => set((state) => ({
    products: state.products.map(p => p.id === productId ? { ...p, stockQty: newQty } : p)
  })),

  importProductToStore: (productId, sellingPrice, desc) => set((state) => {
    const uid = state.currentUserId;
    if (!uid) return {};
    const product = state.products.find((p) => p.id === productId);
    if (!product) return {};
    const exists = state.dropshipperProducts.find(
      (dp) => dp.productId === productId && dp.dropshipperId === uid,
    );
    if (exists) return {};
    const newImported: DropshipperProduct = {
      id: `local-${Date.now()}`,
      dropshipperId: uid,
      productId,
      product,
      sellingPrice,
      customDescription: desc || product.description,
      isPublished: true,
    };
    return { dropshipperProducts: [...state.dropshipperProducts, newImported] };
  }),

  togglePublishProduct: (dropshipperProductId) => set((state) => ({
    dropshipperProducts: state.dropshipperProducts.map(dp =>
      dp.id === dropshipperProductId ? { ...dp, isPublished: !dp.isPublished } : dp
    )
  })),

  updateImportedPrice: (dropshipperProductId, price) => set((state) => ({
    dropshipperProducts: state.dropshipperProducts.map(dp =>
      dp.id === dropshipperProductId ? { ...dp, sellingPrice: price } : dp
    )
  })),

  removeImportedProduct: (dropshipperProductId) => set((state) => ({
    dropshipperProducts: state.dropshipperProducts.filter(dp => dp.id !== dropshipperProductId)
  })),

  withdrawFunds: (userId, amount, details) => {
    const state = get();
    const wallet = state.wallets[userId];
    if (!wallet || wallet.balance < amount || amount <= 0) return false;

    const updatedWallets = { ...state.wallets };
    updatedWallets[userId] = { ...wallet, balance: wallet.balance - amount };

    const tx: Transaction = {
      id: `local-tx-${Date.now()}`,
      walletId: wallet.id,
      amount,
      type: 'withdrawal',
      description: `Withdrawal to MoMo wallet (${details})`,
      reference: `WDR-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
    };

    set({ wallets: updatedWallets, transactions: [tx, ...state.transactions] });
    return true;
  },

  submitCheckout: (checkoutData) => {
    const state = get();
    if (state.cart.length === 0) return { success: false };

    const orderNumber = `LDK-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId = `local-o-${Date.now()}`;

    let totalAmount = 0;
    let profitAmount = 0;
    let costAmount = 0;

    const orderItems: OrderItem[] = state.cart.map((cartItem, idx) => {
      const dpProd = state.dropshipperProducts.find((dp) => dp.id === cartItem.dropshipperProductId);
      if (!dpProd) throw new Error('Product not found');
      const itemTotal = dpProd.sellingPrice * cartItem.quantity;
      const itemProfit = (dpProd.sellingPrice - dpProd.product.costPrice) * cartItem.quantity;
      totalAmount += itemTotal;
      profitAmount += itemProfit;
      costAmount += dpProd.product.costPrice * cartItem.quantity;
      return {
        id: `oi-${idx}-${Date.now()}`,
        productId: dpProd.productId,
        productName: dpProd.product.name,
        quantity: cartItem.quantity,
        unitPrice: dpProd.sellingPrice,
        costPrice: dpProd.product.costPrice,
      };
    });

    const firstDp = state.dropshipperProducts.find((dp) => dp.id === state.cart[0].dropshipperProductId);

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId: state.currentUserId ?? 'guest',
      customerName: checkoutData.fullName,
      customerPhone: checkoutData.phone,
      dropshipperId: firstDp?.dropshipperId ?? '',
      dropshipperStoreName: '',
      supplierId: firstDp?.product.supplierId ?? '',
      supplierBusinessName: firstDp?.product.supplierName ?? '',
      status: 'pending',
      totalAmount,
      profitAmount,
      costAmount,
      deliveryAddress: {
        fullName: checkoutData.fullName,
        phone: checkoutData.phone,
        region: checkoutData.region,
        city: checkoutData.city,
        ghanaPostGps: checkoutData.ghanaPostGps,
      },
      items: orderItems,
      notes: checkoutData.notes,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({ orders: [newOrder, ...s.orders], cart: [] }));
    return { success: true, orderNumber };
  },

  // Fulfill orders
  fulfillOrder: (orderId) => set((state) => ({
    orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'processing' } : o)
  })),

  shipOrder: (orderId) => set((state) => ({
    orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o)
  })),

  // Admin approves a supplier
  approveSupplier: (supplierProfileId) => set((state) => ({
    supplierProfiles: state.supplierProfiles.map(p =>
      p.id === supplierProfileId ? { ...p, isApproved: true } : p
    )
  })),

  // Admin releases commission
  releaseCommission: (commissionId) => set((state) => ({
    commissions: state.commissions.map(c =>
      c.id === commissionId ? { ...c, status: 'paid' } : c
    )
  }))
}));
