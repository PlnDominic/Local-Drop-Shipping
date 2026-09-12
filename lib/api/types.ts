// ── Envelope ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'dropshipper' | 'supplier';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

// ── Users ─────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'customer' | 'dropshipper' | 'supplier' | 'admin';
  avatarUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

// ── Products ──────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  supplierId: string;
  supplierName: string;
  categoryId: string;
  categorySlug: string;
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

export interface CreateProductPayload {
  categoryId: string;
  name: string;
  description: string;
  images: string[];
  costPrice: number;
  suggestedPrice: number;
  stockQty: number;
  sku: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  isActive?: boolean;
}

export interface ProductsQuery {
  page?: number;
  limit?: number;
  category?: string;
}

// ── Dropshipper ───────────────────────────────────────────────────────────
export interface DropshipperProduct {
  id: string;
  dropshipperId: string;
  productId: string;
  product: Product;
  sellingPrice: number;
  customDescription: string;
  isPublished: boolean;
  createdAt: string;
}

export interface ImportProductPayload {
  productId: string;
  sellingPrice: number;
  customDescription?: string;
}

export interface UpdateImportedPricePayload {
  sellingPrice: number;
  customDescription?: string;
  isPublished?: boolean;
}

export interface DropshipperStore {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  description: string;
  logoUrl?: string;
  commissionRate: number;
}

export interface UpdateDropshipperStorePayload {
  storeName?: string;
  description?: string;
  logoUrl?: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
}

export interface DropshipperStoreProfile {
  id: string;
  businessName: string;
  storeName: string;
  storeSlug: string;
  description: string;
  logoUrl?: string;
  location?: string;
  commissionRate: number;
  createdAt: string;
  // Storefront customization
  themeColor: string;
  bannerUrl?: string;
  tagline?: string;
  announcement?: string;
  whatsapp?: string;
  socialLinks: SocialLinks;
  featuredProductIds: string[];
}

// ── Orders ────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  region: string;
  city: string;
  ghanaPostGps: string;
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
  status: OrderStatus;
  totalAmount: number;
  profitAmount: number;
  costAmount: number;
  deliveryAddress: DeliveryAddress;
  items: OrderItem[];
  notes?: string;
  createdAt: string;
}

export interface CreateOrderPayload {
  dropshipperId: string;
  deliveryAddress: DeliveryAddress;
  paymentProvider: 'mtn_momo' | 'vodafone_cash' | 'airteltigo' | 'bank_card';
  momoNumber?: string;
  notes?: string;
  items: Array<{
    dropshipperProductId: string;
    quantity: number;
  }>;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}

// ── Payments ──────────────────────────────────────────────────────────────
export type PaymentProvider = 'mtn_momo' | 'vodafone_cash' | 'airteltigo' | 'bank_card';

export interface InitiatePaymentPayload {
  orderId: string;
  provider: PaymentProvider;
  momoNumber?: string;
  amount: number;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  reference: string;
  provider: PaymentProvider;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

// ── Wallet ────────────────────────────────────────────────────────────────
export interface WalletBalance {
  balance: number;
  totalEarned: number;
  currency: 'GHS';
}

export interface WithdrawPayload {
  amount: number;
  momoNumber: string;
  provider: PaymentProvider;
  details?: string;
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

// ── Analytics ─────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  commissionEarned: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
}

export interface OrdersChartPoint {
  date: string;
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
}

// ── Admin ─────────────────────────────────────────────────────────────────
export interface SupplierApprovalPayload {
  approved: boolean;
  reason?: string;
}

export interface AdminReport {
  totalUsers: number;
  totalSuppliers: number;
  totalDropshippers: number;
  totalRevenue: number;
  platformFees: number;
  pendingApprovals: number;
}

export interface Commission {
  id: string;
  orderId: string;
  orderNumber: string;
  dropshipperId: string;
  dropshipperName: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: string;
}
