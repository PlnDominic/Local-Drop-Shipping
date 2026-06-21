import { create } from 'zustand';

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
  
  // Database Tables
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

// Initial Mock Data Setup
const mockUsers: User[] = [
  {
    id: 'u-customer-1',
    email: 'ama.mensah@gmail.com',
    phone: '+233 24 412 3456',
    fullName: 'Ama Mensah',
    role: 'customer',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    isVerified: true
  },
  {
    id: 'u-dropshipper-1',
    email: 'kofi.deals@localdropshipping.gh.com',
    phone: '+233 55 876 5432',
    fullName: 'Kofi Owusu',
    role: 'dropshipper',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    isVerified: true
  },
  {
    id: 'u-supplier-1',
    email: 'contact@kantanka-electronics.com',
    phone: '+233 20 999 8888',
    fullName: 'Kantanka Wholesalers Ltd.',
    role: 'supplier',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    isVerified: true
  },
  {
    id: 'u-supplier-2',
    email: 'accrafashionhub@gmail.com',
    phone: '+233 24 111 2222',
    fullName: 'Accra Fashion District Hub',
    role: 'supplier',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
    isVerified: false // Needs Admin Approval
  },
  {
    id: 'u-admin-1',
    email: 'admin@localdropshipping.gh.com',
    phone: '+233 24 000 0000',
    fullName: 'Yaw Boateng (Admin)',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
    isVerified: true
  }
];

const mockSupplierProfiles: SupplierProfile[] = [
  {
    id: 'sp-1',
    userId: 'u-supplier-1',
    businessName: 'Kantanka Wholesalers Ltd.',
    businessRegNumber: 'CG012938483',
    region: 'Greater Accra',
    isApproved: true,
    rating: 4.8
  },
  {
    id: 'sp-2',
    userId: 'u-supplier-2',
    businessName: 'Accra Fashion District Hub',
    businessRegNumber: 'CG018274619',
    region: 'Ashanti Region',
    isApproved: false, // Pending admin approval
    rating: 0.0
  }
];

const mockDropshipperProfiles: DropshipperProfile[] = [
  {
    id: 'dp-1',
    userId: 'u-dropshipper-1',
    storeName: 'Kofi\'s Express Deals',
    storeSlug: 'kofiexpress',
    commissionRate: 12.50
  }
];

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Electronics', slug: 'electronics', icon: 'Tv' },
  { id: 'cat-2', name: 'Fashion & Apparel', slug: 'fashion', icon: 'Shirt' },
  { id: 'cat-3', name: 'Beauty & Cosmetics', slug: 'beauty', icon: 'Sparkles' },
  { id: 'cat-4', name: 'Home & Kitchen', slug: 'home', icon: 'Home' },
  { id: 'cat-5', name: 'Health & Wellness', slug: 'health', icon: 'Activity' },
  { id: 'cat-6', name: 'Local Foodstuffs', slug: 'food', icon: 'Utensils' }
];

const mockProducts: Product[] = [
  {
    id: 'p-1',
    supplierId: 'sp-1',
    supplierName: 'Kantanka Wholesalers Ltd.',
    categoryId: 'cat-1',
    name: 'Kantanka Smart TV 43" (4K UHD)',
    description: 'Stunning 4K Ultra High Definition smart TV made right here in Ghana. Preloaded with Netflix, YouTube, and DSTV app. Energy efficient, built for West African power grids.',
    images: ['https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&h=400&q=80'],
    costPrice: 1800.00,
    suggestedPrice: 2200.00,
    stockQty: 45,
    sku: 'KTK-TV-43',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-2',
    supplierId: 'sp-1',
    supplierName: 'Kantanka Wholesalers Ltd.',
    categoryId: 'cat-1',
    name: 'Wireless MoMo Power Bank 20,000mAh',
    description: 'Heavy duty power bank with solar charging capability and integrated cables. Perfect for long travel days and keeping your phones running during dumsor.',
    images: ['https://images.unsplash.com/photo-1609592424109-dd9892f1b17c?auto=format&fit=crop&w=600&h=400&q=80'],
    costPrice: 120.00,
    suggestedPrice: 180.00,
    stockQty: 150,
    sku: 'KTK-PB-20K',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-3',
    supplierId: 'sp-2',
    supplierName: 'Accra Fashion District Hub',
    categoryId: 'cat-2',
    name: 'Premium Kente Print Unisex Bomber Jacket',
    description: 'Handwoven genuine Bonwire Kente print sleeves with comfortable fleece body. High quality local zipper and inner lining. Crafted in Kumasi.',
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&h=400&q=80'],
    costPrice: 250.00,
    suggestedPrice: 350.00,
    stockQty: 30,
    sku: 'AFD-KNT-JKT',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-4',
    supplierId: 'sp-1',
    supplierName: 'Kantanka Wholesalers Ltd.',
    categoryId: 'cat-4',
    name: 'Ghanaian Handcarved Mortar & Pestle Set',
    description: 'Sturdy Sesese wood mortar and pestle for fufu, palm nut pounding, and crushing spices. Traditional design, long-lasting wood quality.',
    images: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&h=400&q=80'],
    costPrice: 85.00,
    suggestedPrice: 130.00,
    stockQty: 80,
    sku: 'KTK-MOR-PES',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Initial imported dropshipper products (Published under Kofi's Store)
const mockDropshipperProducts: DropshipperProduct[] = [
  {
    id: 'dp-prod-1',
    dropshipperId: 'dp-1',
    productId: 'p-1',
    product: mockProducts[0],
    sellingPrice: 2150.00, // profit: 350.00
    customDescription: 'Bring cinema quality entertainment to your home with the original 43" Smart TV, engineered for stable power performance and featuring local app integration.',
    isPublished: true
  },
  {
    id: 'dp-prod-2',
    dropshipperId: 'dp-1',
    productId: 'p-2',
    product: mockProducts[1],
    sellingPrice: 175.00, // profit: 55.00
    customDescription: 'Say goodbye to Dumsor! Premium 20,000mAh Power Bank with Solar backup charging. Charges 3 devices at once.',
    isPublished: true
  },
  {
    id: 'dp-prod-3',
    dropshipperId: 'dp-1',
    productId: 'p-3',
    product: mockProducts[2],
    sellingPrice: 340.00,
    customDescription: 'Premium Kente print bomber jacket from a local fashion supplier, ready for fast delivery.',
    isPublished: true
  },
  {
    id: 'dp-prod-4',
    dropshipperId: 'dp-1',
    productId: 'p-4',
    product: mockProducts[3],
    sellingPrice: 125.00,
    customDescription: 'Traditional Ghanaian mortar and pestle set for home kitchens and local food lovers.',
    isPublished: true
  }
];

// Prepopulated Wallets
const initialWallets: Record<string, Wallet> = {
  'u-dropshipper-1': { id: 'w-dp-1', userId: 'u-dropshipper-1', balance: 450.00, totalEarned: 1850.00 },
  'u-supplier-1': { id: 'w-sp-1', userId: 'u-supplier-1', balance: 5400.00, totalEarned: 12500.00 },
  'u-supplier-2': { id: 'w-sp-2', userId: 'u-supplier-2', balance: 0.00, totalEarned: 0.00 },
  'u-admin-1': { id: 'w-ad-1', userId: 'u-admin-1', balance: 125.50, totalEarned: 890.00 },
};

export const useGlobalStore = create<AppState>((set, get) => ({
  activeRole: 'customer',
  setActiveRole: (role) => set({ activeRole: role }),
  mobilePreview: false,
  setMobilePreview: (active) => set({ mobilePreview: active }),

  users: mockUsers,
  supplierProfiles: mockSupplierProfiles,
  dropshipperProfiles: mockDropshipperProfiles,
  categories: mockCategories,
  products: mockProducts,
  dropshipperProducts: mockDropshipperProducts,
  orders: [],
  wallets: initialWallets,
  transactions: [],
  commissions: [],
  notifications: [
    {
      id: 'notif-init',
      type: 'sms',
      recipient: '+233 55 876 5432',
      message: 'Welcome to LocalDropshipping.gh.com! Start importing products to your store now.',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ],
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

  // Supplier adds a product
  addSupplierProduct: (productData) => set((state) => {
    const newProduct: Product = {
      ...productData,
      id: `p-${state.products.length + 1}`,
      supplierId: 'sp-1', // Default acting supplier
      supplierName: 'Kantanka Wholesalers Ltd.',
      createdAt: new Date().toISOString()
    };
    
    // Add transaction log
    const notification: NotificationLog = {
      id: `notif-${Date.now()}`,
      type: 'email',
      recipient: 'contact@kantanka-electronics.com',
      message: `Product uploaded successfully: ${newProduct.name}. Pending dropshipper discovery.`,
      timestamp: new Date().toISOString()
    };

    return {
      products: [...state.products, newProduct],
      notifications: [notification, ...state.notifications]
    };
  }),

  updateSupplierProductStock: (productId, newQty) => set((state) => ({
    products: state.products.map(p => p.id === productId ? { ...p, stockQty: newQty } : p)
  })),

  // Dropshipper Imports
  importProductToStore: (productId, sellingPrice, desc) => set((state) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return {};

    // Check if already imported
    const exists = state.dropshipperProducts.find(dp => dp.productId === productId && dp.dropshipperId === 'dp-1');
    if (exists) return {};

    const newImported: DropshipperProduct = {
      id: `dp-prod-${state.dropshipperProducts.length + 1}`,
      dropshipperId: 'dp-1',
      productId: productId,
      product: product,
      sellingPrice: sellingPrice,
      customDescription: desc || product.description,
      isPublished: true
    };

    return {
      dropshipperProducts: [...state.dropshipperProducts, newImported]
    };
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

  // Fulfill orders
  fulfillOrder: (orderId) => set((state) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return {};

    // Notify Customer via SMS
    const customerSMS: NotificationLog = {
      id: `notif-${Date.now()}-c`,
      type: 'sms',
      recipient: order.deliveryAddress.phone,
      message: `Hi ${order.deliveryAddress.fullName}, your order ${order.orderNumber} is processing! GhanaPost GPS tracker code: ${order.deliveryAddress.ghanaPostGps}.`,
      timestamp: new Date().toISOString()
    };

    return {
      orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'processing' } : o),
      notifications: [customerSMS, ...state.notifications]
    };
  }),

  shipOrder: (orderId) => set((state) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return {};

    // Update status to shipped, and immediately credit funds to wallets
    const supplierUserId = state.users.find(u => u.fullName === order.supplierBusinessName)?.id || 'u-supplier-1';
    const dropshipperUserId = 'u-dropshipper-1';

    // Supplier gets: cost price * quantity
    // Dropshipper gets: profit margin (selling price - cost price) * quantity
    // Admin gets a 2% platform fee on transaction (let's deduct from supplier or credit separately)
    const platformFee = order.totalAmount * 0.02;
    const finalSupplierPayout = order.costAmount - platformFee;

    // Wallets update
    const updatedWallets = { ...state.wallets };
    
    // Credit Supplier
    if (updatedWallets[supplierUserId]) {
      updatedWallets[supplierUserId] = {
        ...updatedWallets[supplierUserId],
        balance: updatedWallets[supplierUserId].balance + finalSupplierPayout,
        totalEarned: updatedWallets[supplierUserId].totalEarned + finalSupplierPayout,
      };
    }

    // Credit Dropshipper (release commission)
    if (updatedWallets[dropshipperUserId]) {
      updatedWallets[dropshipperUserId] = {
        ...updatedWallets[dropshipperUserId],
        balance: updatedWallets[dropshipperUserId].balance + order.profitAmount,
        totalEarned: updatedWallets[dropshipperUserId].totalEarned + order.profitAmount,
      };
    }

    // Credit Admin (platform fee)
    if (updatedWallets['u-admin-1']) {
      updatedWallets['u-admin-1'] = {
        ...updatedWallets['u-admin-1'],
        balance: updatedWallets['u-admin-1'].balance + platformFee,
        totalEarned: updatedWallets['u-admin-1'].totalEarned + platformFee,
      };
    }

    // Generate Transactions
    const txs: Transaction[] = [
      {
        id: `tx-${Date.now()}-sp`,
        walletId: updatedWallets[supplierUserId]?.id || 'w-sp-1',
        amount: finalSupplierPayout,
        type: 'credit',
        description: `Payout for order ${order.orderNumber} (minus platform fee)`,
        reference: order.orderNumber,
        createdAt: new Date().toISOString()
      },
      {
        id: `tx-${Date.now()}-dp`,
        walletId: updatedWallets[dropshipperUserId]?.id || 'w-dp-1',
        amount: order.profitAmount,
        type: 'credit',
        description: `Commission earned on order ${order.orderNumber}`,
        reference: order.orderNumber,
        createdAt: new Date().toISOString()
      },
      {
        id: `tx-${Date.now()}-ad`,
        walletId: updatedWallets['u-admin-1']?.id || 'w-ad-1',
        amount: platformFee,
        type: 'credit',
        description: `2% Platform fee from order ${order.orderNumber}`,
        reference: order.orderNumber,
        createdAt: new Date().toISOString()
      }
    ];

    // Notification Logs
    const dropshipperNotif: NotificationLog = {
      id: `notif-${Date.now()}-dpn`,
      type: 'whatsapp',
      recipient: '+233 55 876 5432',
      message: `🔥 High five Kofi! You earned GHS ${order.profitAmount.toFixed(2)} on Order ${order.orderNumber}. Balance updated!`,
      timestamp: new Date().toISOString()
    };

    const customerNotif: NotificationLog = {
      id: `notif-${Date.now()}-cust`,
      type: 'sms',
      recipient: order.deliveryAddress.phone,
      message: `Your package for Order ${order.orderNumber} has been shipped! It is on its way to ${order.deliveryAddress.city}.`,
      timestamp: new Date().toISOString()
    };

    return {
      orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o),
      wallets: updatedWallets,
      transactions: [...txs, ...state.transactions],
      notifications: [dropshipperNotif, customerNotif, ...state.notifications]
    };
  }),

  // Customer Checkout
  submitCheckout: (checkoutData) => {
    const state = get();
    if (state.cart.length === 0) return { success: false };

    // Group items by supplier (since multiple products might belong to different suppliers)
    // To keep it simple, we assume checkout is processed for a single store cart (under Kofi's Store)
    const orderNumber = `LDK-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId = `o-${Date.now()}`;

    let totalAmount = 0;
    let profitAmount = 0;
    let costAmount = 0;

    const orderItems: OrderItem[] = state.cart.map((cartItem, idx) => {
      const dpProd = state.dropshipperProducts.find(dp => dp.id === cartItem.dropshipperProductId);
      if (!dpProd) throw new Error('Product not found');

      const itemCost = dpProd.product.costPrice * cartItem.quantity;
      const itemTotal = dpProd.sellingPrice * cartItem.quantity;
      const itemProfit = (dpProd.sellingPrice - dpProd.product.costPrice) * cartItem.quantity;

      totalAmount += itemTotal;
      profitAmount += itemProfit;
      costAmount += itemCost;

      return {
        id: `oi-${idx}-${Date.now()}`,
        productId: dpProd.productId,
        productName: dpProd.product.name,
        quantity: cartItem.quantity,
        unitPrice: dpProd.sellingPrice,
        costPrice: dpProd.product.costPrice
      };
    });

    // Assume the supplier of the first product in cart
    const firstDpProd = state.dropshipperProducts.find(dp => dp.id === state.cart[0].dropshipperProductId);
    const supplierId = firstDpProd?.product.supplierId || 'sp-1';
    const supplierProfile = state.supplierProfiles.find(sp => sp.id === supplierId);
    const supplierBusinessName = supplierProfile?.businessName || 'Kantanka Wholesalers Ltd.';

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId: 'u-customer-1',
      customerName: checkoutData.fullName,
      customerPhone: checkoutData.phone,
      dropshipperId: 'dp-1',
      dropshipperStoreName: 'Kofi\'s Express Deals',
      supplierId,
      supplierBusinessName,
      status: 'pending',
      totalAmount,
      profitAmount,
      costAmount,
      deliveryAddress: {
        fullName: checkoutData.fullName,
        phone: checkoutData.phone,
        region: checkoutData.region,
        city: checkoutData.city,
        ghanaPostGps: checkoutData.ghanaPostGps
      },
      items: orderItems,
      notes: checkoutData.notes,
      createdAt: new Date().toISOString()
    };

    // Update Product Stock Quantities
    state.cart.forEach(cartItem => {
      const dpProd = state.dropshipperProducts.find(dp => dp.id === cartItem.dropshipperProductId);
      if (dpProd) {
        get().updateSupplierProductStock(dpProd.productId, Math.max(0, dpProd.product.stockQty - cartItem.quantity));
      }
    });

    // Create notifications for all entities
    const customerSMS: NotificationLog = {
      id: `notif-${Date.now()}-c1`,
      type: 'sms',
      recipient: checkoutData.phone,
      message: `Order ${orderNumber} received. Paid GHS ${totalAmount.toFixed(2)} via ${checkoutData.paymentProvider.toUpperCase()}. Thank you for shopping with Kofi's Express Deals!`,
      timestamp: new Date().toISOString()
    };

    const dropshipperWhatsApp: NotificationLog = {
      id: `notif-${Date.now()}-d1`,
      type: 'whatsapp',
      recipient: '+233 55 876 5432',
      message: `🔔 New Order alert! Customer ${checkoutData.fullName} bought items for GHS ${totalAmount.toFixed(2)}. Your pending profit: GHS ${profitAmount.toFixed(2)}.`,
      timestamp: new Date().toISOString()
    };

    const supplierEmail: NotificationLog = {
      id: `notif-${Date.now()}-s1`,
      type: 'email',
      recipient: 'contact@kantanka-electronics.com',
      message: `New dropshipping order ${orderNumber} received. Total fulfillment cost payout: GHS ${costAmount.toFixed(2)}. Fulfill it now in your portal.`,
      timestamp: new Date().toISOString()
    };

    // Add Commission record
    const newCommission: Commission = {
      id: `comm-${Date.now()}`,
      orderId,
      orderNumber,
      dropshipperId: 'dp-1',
      amount: profitAmount,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      orders: [newOrder, ...state.orders],
      commissions: [newCommission, ...state.commissions],
      notifications: [customerSMS, dropshipperWhatsApp, supplierEmail, ...state.notifications],
      cart: [] // empty cart
    }));

    return { success: true, orderNumber };
  },

  // Dropshipper wallet withdrawal
  withdrawFunds: (userId, amount, details) => {
    const state = get();
    const wallet = state.wallets[userId];
    if (!wallet || wallet.balance < amount || amount <= 0) return false;

    // Deduct balance
    const updatedWallets = { ...state.wallets };
    updatedWallets[userId] = {
      ...wallet,
      balance: wallet.balance - amount
    };

    // Create transaction log
    const tx: Transaction = {
      id: `tx-${Date.now()}-w`,
      walletId: wallet.id,
      amount,
      type: 'withdrawal',
      description: `Withdrawal to MoMo wallet (${details})`,
      reference: `WDR-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString()
    };

    // Create SMS confirmation
    const sms: NotificationLog = {
      id: `notif-${Date.now()}-smsw`,
      type: 'sms',
      recipient: state.users.find(u => u.id === userId)?.phone || '',
      message: `GHS ${amount.toFixed(2)} has been withdrawn from your LocalDropshipping wallet to ${details}. Reference: ${tx.reference}.`,
      timestamp: new Date().toISOString()
    };

    set({
      wallets: updatedWallets,
      transactions: [tx, ...state.transactions],
      notifications: [sms, ...state.notifications]
    });

    return true;
  },

  // Admin approves a supplier
  approveSupplier: (supplierProfileId) => set((state) => {
    const sp = state.supplierProfiles.find(p => p.id === supplierProfileId);
    if (!sp) return {};

    const updatedProfiles = state.supplierProfiles.map(p =>
      p.id === supplierProfileId ? { ...p, isApproved: true } : p
    );

    const updatedUsers = state.users.map(u =>
      u.id === sp.userId ? { ...u, isVerified: true } : u
    );

    const email: NotificationLog = {
      id: `notif-${Date.now()}-app`,
      type: 'email',
      recipient: state.users.find(u => u.id === sp.userId)?.email || '',
      message: `Congratulations! Your supplier account for ${sp.businessName} has been approved. You can now start listing products.`,
      timestamp: new Date().toISOString()
    };

    return {
      supplierProfiles: updatedProfiles,
      users: updatedUsers,
      notifications: [email, ...state.notifications]
    };
  }),

  // Admin releases commission manually (if needed)
  releaseCommission: (commissionId) => set((state) => ({
    commissions: state.commissions.map(c =>
      c.id === commissionId ? { ...c, status: 'paid' } : c
    )
  }))
}));
