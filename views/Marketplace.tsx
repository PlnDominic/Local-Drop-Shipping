'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Gift,
  Heart,
  LayoutGrid,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Tag,
  Truck,
  User,
  X,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobalStore } from '../store/globalStore';
import type { DropshipperProduct, ProductReview } from '../store/globalStore';
import { useToast } from '../components/Toast';
import { useAuth } from '../lib/auth/AuthProvider';

const heroImage =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=90';
const heroBanner2 =
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80';
const heroBanner3 =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

const PAGE_SIZE = 8;

const formatMoney = (amount: number) =>
  `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const getCategoryLabel = (categoryId: string) => {
  switch (categoryId) {
    case 'cat-1': return 'Electronics';
    case 'cat-2': return 'Fashion';
    case 'cat-3': return 'Beauty';
    case 'cat-4': return 'Home';
    case 'cat-5': return 'Health';
    case 'cat-6': return 'Food';
    default: return 'Other';
  }
};

const computeAvgRating = (reviews: ProductReview[]): number => {
  if (!reviews || reviews.length === 0) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
};

const StarDisplay: React.FC<{ rating: number; size?: number }> = ({ rating, size = 13 }) => (
  <span className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        fill={n <= Math.round(rating) ? '#f5a524' : 'none'}
        stroke={n <= Math.round(rating) ? '#f5a524' : '#ccc'}
        strokeWidth={1.5}
      />
    ))}
  </span>
);

const SkeletonCard: React.FC = () => (
  <div className="min-w-0 animate-pulse rounded border border-gray-100 bg-white p-3">
    <div className="aspect-square bg-gray-200 rounded" />
    <div className="pt-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-3 bg-gray-200 rounded w-1/3" />
      <div className="mt-3 h-9 bg-gray-200 rounded" />
    </div>
  </div>
);

const ProductModal: React.FC<{
  product: DropshipperProduct;
  onClose: () => void;
  onAddToCart: (id: string) => void;
  onBuyNow: (id: string) => void;
}> = ({ product, onClose, onAddToCart, onBuyNow }) => {
  const reviews = product.product.reviews || [];
  const avgRating = computeAvgRating(reviews);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl bg-white shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white hover:bg-gray-50"
        >
          <X size={18} />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="bg-[#f7f7f7] aspect-square flex items-center justify-center p-8 rounded-tl-lg rounded-bl-lg">
            <img
              src={product.product.images[0]}
              alt={product.product.name}
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <span className="inline-block bg-[#f04438]/10 text-[#f04438] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded mb-2">
                {getCategoryLabel(product.product.categoryId)}
              </span>
              <h2 className="text-[20px] font-black leading-tight text-[#151515]">
                {product.product.name}
              </h2>
              <p className="mt-1 text-xs text-[#777]">By {product.product.supplierName}</p>
            </div>
            <p className="text-sm leading-relaxed text-[#444]">{product.customDescription}</p>
            <div className="flex items-center gap-3">
              <StarDisplay rating={avgRating} size={16} />
              <span className="text-xs font-bold text-[#777]">
                {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <strong className="text-2xl font-black text-[#f04438]">{formatMoney(product.sellingPrice)}</strong>
              <span className="text-xs text-[#777]">{product.product.stockQty} in stock</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { onAddToCart(product.id); onClose(); }}
                className="h-11 rounded border border-[#151515] bg-white px-3 text-[11px] font-black text-[#151515] transition-colors hover:bg-gray-50"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => { onBuyNow(product.id); onClose(); }}
                className="h-11 rounded border border-[#f04438] bg-[#f04438] px-3 text-[11px] font-black text-white transition-colors hover:bg-[#c0392b]"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="border-t border-[#ededed] p-6">
            <h3 className="mb-4 text-[15px] font-black text-[#151515]">Customer Reviews</h3>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-[#f0f0f0] pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StarDisplay rating={review.rating} size={12} />
                      <span className="text-[12px] font-black text-[#151515]">{review.author}</span>
                    </div>
                    <span className="text-[10px] text-[#aaa]">{review.date}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[#555]">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductCard: React.FC<{
  product: DropshipperProduct;
  onAddToCart: (id: string) => void;
  onBuyNow: (id: string) => void;
  onOpenDetail: (product: DropshipperProduct) => void;
  horizontal?: boolean;
}> = ({ product, onAddToCart, onBuyNow: _onBuyNow, onOpenDetail, horizontal = false }) => {
  const reviews = product.product.reviews || [];
  const avgRating = computeAvgRating(reviews);
  const discount = product.product.suggestedPrice > product.sellingPrice
    ? Math.round(((product.product.suggestedPrice - product.sellingPrice) / product.product.suggestedPrice) * 100)
    : 0;

  if (horizontal) {
    return (
      <article className="flex gap-3 p-3 border border-gray-100 rounded bg-white hover:shadow-sm transition-shadow">
        <div
          className="w-16 h-16 flex-shrink-0 bg-[#f7f7f7] rounded cursor-pointer flex items-center justify-center"
          onClick={() => onOpenDetail(product)}
        >
          <img src={product.product.images[0]} alt={product.product.name} className="w-full h-full object-contain p-1 mix-blend-multiply" />
        </div>
        <div className="min-w-0 flex-1">
          <h4
            className="line-clamp-2 text-xs font-bold text-[#151515] cursor-pointer hover:text-[#f04438] leading-tight"
            onClick={() => onOpenDetail(product)}
          >
            {product.product.name}
          </h4>
          <StarDisplay rating={avgRating} size={10} />
          <p className="mt-1 text-sm font-black text-[#f04438]">{formatMoney(product.sellingPrice)}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="group min-w-0 bg-white border border-gray-100 rounded hover:shadow-md transition-shadow">
      <div
        className="relative overflow-hidden bg-[#f7f7f7] aspect-square cursor-pointer rounded-t"
        onClick={() => onOpenDetail(product)}
      >
        {discount > 0 && (
          <span className="absolute left-2 top-2 z-10 bg-[#f04438] px-2 py-0.5 text-[10px] font-black text-white rounded">
            -{discount}%
          </span>
        )}
        <button
          type="button"
          aria-label="Wishlist"
          onClick={(e) => { e.stopPropagation(); }}
          className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart size={13} className="text-gray-400 hover:text-[#f04438]" />
        </button>
        <img
          src={product.product.images[0]}
          alt={product.product.name}
          className="h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <span className="text-[9px] font-bold text-[#777] uppercase tracking-wider">
          {getCategoryLabel(product.product.categoryId)}
        </span>
        <h3
          className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-tight text-[#151515] cursor-pointer hover:text-[#f04438] transition-colors"
          onClick={() => onOpenDetail(product)}
        >
          {product.product.name}
        </h3>
        <div className="mt-1 flex items-center gap-1">
          <StarDisplay rating={avgRating} size={10} />
          <span className="text-[10px] text-[#999]">({reviews.length})</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[15px] font-black text-[#f04438]">{formatMoney(product.sellingPrice)}</span>
          {discount > 0 && (
            <span className="text-[11px] text-[#bbb] line-through">{formatMoney(product.product.suggestedPrice)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAddToCart(product.id)}
          className="mt-3 w-full h-9 rounded bg-[#151515] text-[11px] font-black text-white transition-colors hover:bg-[#f04438]"
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
};

export const Marketplace: React.FC = () => {
  const {
    dropshipperProducts,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    submitCheckout,
    appliedPromo,
    applyPromoCode,
    clearPromo
  } = useGlobalStore();

  const { showToast } = useToast();
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const dashboardHref =
    profile?.role === 'supplier' ? '/supplier'
    : profile?.role === 'admin' ? '/admin'
    : profile?.role === 'dropshipper' ? '/dropshipper'
    : null;

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'featured' | 'bestseller' | 'latest'>('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [detailProduct, setDetailProduct] = useState<DropshipperProduct | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [activeCategory, activeTab, query]);

  const publishedProducts = useMemo(
    () => dropshipperProducts.filter((item) => item.isPublished),
    [dropshipperProducts]
  );

  const catalogProducts = useMemo(
    () => [...publishedProducts, ...publishedProducts.slice().reverse(), ...publishedProducts.slice(0, 1)],
    [publishedProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = catalogProducts.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.product.categoryId === activeCategory;
      const matchesSearch =
        q.length === 0 ||
        item.product.name.toLowerCase().includes(q) ||
        item.customDescription.toLowerCase().includes(q) ||
        item.product.supplierName.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    if (activeTab === 'bestseller') {
      result = [...result].sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (activeTab === 'latest') {
      result = [...result].reverse();
    }

    return result;
  }, [activeCategory, catalogProducts, query, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, '...', totalPages - 1, totalPages];
    if (currentPage >= totalPages - 2)
      return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [totalPages, currentPage]);

  const topRated = useMemo(
    () => [...catalogProducts]
      .sort((a, b) => computeAvgRating(b.product.reviews || []) - computeAvgRating(a.product.reviews || []))
      .slice(0, 6),
    [catalogProducts]
  );

  const cartLines = cart
    .map((line) => {
      const item = publishedProducts.find((p) => p.id === line.dropshipperProductId);
      return item ? { ...line, item } : null;
    })
    .filter(Boolean) as Array<{ dropshipperProductId: string; quantity: number; item: DropshipperProduct }>;

  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const cartSubtotal = cartLines.reduce((sum, l) => sum + l.item.sellingPrice * l.quantity, 0);
  const deliveryFee = cartSubtotal > 0 ? 25 : 0;
  const promoDiscount = appliedPromo ? cartSubtotal * appliedPromo.discount : 0;
  const cartTotal = cartSubtotal + deliveryFee - promoDiscount;

  const handleAddToCart = (id: string) => {
    addToCart(id);
    setCartOpen(true);
    showToast('Added to cart!', 'success');
  };
  const handleBuyNow = (id: string) => { addToCart(id); setCartOpen(true); setCheckoutOpen(true); };

  const handleApplyPromo = () => {
    setPromoError('');
    const success = applyPromoCode(promoInput.trim());
    if (success) {
      showToast('Promo code applied!', 'success');
    } else {
      setPromoError('Invalid promo code');
      showToast('Invalid promo code', 'error');
    }
  };

  const handleCheckout = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = submitCheckout({
      fullName: String(form.get('fullName') || 'Ama Mensah'),
      phone: String(form.get('phone') || '+233244123456'),
      region: String(form.get('region') || 'Greater Accra'),
      city: String(form.get('city') || 'Accra'),
      ghanaPostGps: String(form.get('ghanaPostGps') || 'GA-184-9022'),
      paymentProvider: 'mtn_momo',
      momoNumber: String(form.get('momoNumber') || '+233244123456'),
      notes: String(form.get('notes') || '')
    });
    if (result.success && result.orderNumber) {
      setOrderNumber(result.orderNumber);
      setCheckoutOpen(false);
      setCartOpen(false);
      clearPromo();
      setPromoInput('');
      showToast('Order placed successfully!', 'success');
    }
  };

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailSubmitted(true);
    setTimeout(() => setEmailSubmitted(false), 3000);
  };

  const categories = [
    { id: 'all', label: 'All Categories', icon: LayoutGrid },
    { id: 'cat-1', label: 'Electronics', icon: Zap },
    { id: 'cat-2', label: 'Fashion', icon: Heart },
    { id: 'cat-3', label: 'Beauty', icon: Star },
    { id: 'cat-4', label: 'Home & Living', icon: Package },
    { id: 'cat-5', label: 'Health', icon: Gift },
    { id: 'cat-6', label: 'Food & Grocery', icon: Tag },
  ];

  return (
    <main className="min-h-screen bg-[#f4f4f4] text-[#1c1c1c]">

      {/* ── Announcement Bar ── */}
      <div className="bg-[#151515] text-white py-2 text-[11px] font-semibold tracking-wide">
        <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-between gap-2 flex-wrap">
          <span>🎉 Use code <span className="font-black text-[#f04438]">GHANA20</span> for 20% off your first order</span>
          <span className="hidden sm:inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><Phone size={11} /> +233 55 660 9232</span>
            <span className="text-gray-500">|</span>
            <span className="inline-flex items-center gap-1"><Phone size={11} /> +233 54 285 5399</span>
          </span>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center gap-4">

          {/* Logo */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex-shrink-0 font-black text-[#151515] leading-tight text-[13px] sm:text-[17px]"
          >
            <span className="hidden sm:inline">Local Drop Shipping </span>
            <span className="sm:hidden">LDS </span>
            <span className="text-[#f04438]">GH</span>
          </a>

          {/* Search bar */}
          <div className="flex-1 min-w-0 max-w-xl mx-auto">
            <div className="flex h-10 border border-gray-200 rounded overflow-hidden">
              <select
                aria-label="Category"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="hidden sm:block border-r border-gray-200 bg-[#f7f7f7] px-3 text-[11px] font-semibold text-[#444] outline-none flex-shrink-0"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search products"
                placeholder="Search products..."
                className="flex-1 min-w-0 px-3 text-[12px] outline-none"
              />
              <button
                type="button"
                aria-label="Search"
                className="flex-shrink-0 bg-[#f04438] px-3 sm:px-4 text-white hover:bg-[#c0392b] transition-colors"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              aria-label="Wishlist"
              className="hidden sm:flex flex-col items-center gap-0.5 p-2 text-[#555] hover:text-[#f04438] transition-colors"
            >
              <Heart size={20} />
              <span className="text-[9px] font-semibold">Wishlist</span>
            </button>

            <div className="relative">
              <button
                type="button"
                aria-label="Account"
                onClick={() => setAccountOpen((v) => !v)}
                className="flex flex-col items-center gap-0.5 p-2 text-[#555] hover:text-[#151515] transition-colors"
              >
                <User size={20} />
                <span className="hidden sm:block text-[9px] font-semibold">Account</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-14 z-50 w-56 border border-[#ededed] bg-white shadow-lg rounded">
                  {profile ? (
                    <>
                      <div className="border-b border-[#ededed] px-4 py-3">
                        <p className="text-sm font-black text-[#151515] truncate">{profile.fullName || 'Account'}</p>
                        <p className="text-[11px] text-[#777] truncate">{profile.email}</p>
                      </div>
                      <div className="py-1">
                        {dashboardHref && (
                          <Link
                            href={dashboardHref}
                            onClick={() => setAccountOpen(false)}
                            className="block w-full px-4 py-2 text-left text-[12px] font-semibold text-[#333] hover:bg-[#f5f5f5]"
                          >
                            My Dashboard
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={async () => { setAccountOpen(false); await signOut(); router.push('/'); }}
                          className="w-full px-4 py-2 text-left text-[12px] font-semibold text-[#f04438] hover:bg-[#f5f5f5]"
                        >
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 space-y-2">
                      <p className="px-1 text-[11px] text-[#777]">Sign in to track orders and earn commissions.</p>
                      <Link
                        href="/login"
                        onClick={() => setAccountOpen(false)}
                        className="block h-9 rounded bg-[#151515] text-center text-[12px] font-black leading-9 text-white hover:bg-[#f04438] transition-colors"
                      >
                        Sign In
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label="Cart"
              onClick={() => setCartOpen(true)}
              className="relative flex flex-col items-center gap-0.5 p-2 text-[#555] hover:text-[#151515] transition-colors"
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:block text-[9px] font-semibold">Cart</span>
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-[#f04438] px-1 text-[9px] font-black text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Nav Bar ── */}
      <nav className="bg-[#151515] text-white relative z-20">
        <div className="max-w-[1280px] mx-auto px-4 flex items-center h-11 gap-6 text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => setCategoryMenuOpen((v) => !v)}
            className="flex items-center gap-2 bg-[#f04438] h-full px-4 font-bold hover:bg-[#c0392b] transition-colors flex-shrink-0"
          >
            <LayoutGrid size={14} />
            All Categories
            <ChevronDown size={13} className={categoryMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>

          {['Marketplace', 'New Arrivals', 'Supplier Portal', 'Start Dropshipping', 'API Docs'].map((link) => (
            <a key={link} href="#" onClick={(e) => e.preventDefault()} className="hidden md:block whitespace-nowrap hover:text-[#f04438] transition-colors">
              {link}
            </a>
          ))}

          <div className="ml-auto flex items-center gap-2 text-[#f04438] font-black hidden md:flex">
            <Zap size={14} />
            Special Offer Today!
          </div>
        </div>

        {/* Category dropdown */}
        {categoryMenuOpen && (
          <div className="absolute left-0 top-full w-64 bg-white text-[#151515] shadow-xl rounded-br-lg z-50 border border-gray-100">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setActiveCategory(cat.id); setCategoryMenuOpen(false); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-[12px] font-semibold hover:bg-[#f7f7f7] transition-colors ${activeCategory === cat.id ? 'text-[#f04438]' : 'text-[#333]'}`}
                >
                  <Icon size={15} className={activeCategory === cat.id ? 'text-[#f04438]' : 'text-[#999]'} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Click-away for category menu */}
      {categoryMenuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setCategoryMenuOpen(false)} />
      )}

      <div className="max-w-[1280px] mx-auto px-4 py-5">

        {/* ── Hero + Sidebar layout ── */}
        <div className="grid grid-cols-[220px_1fr] gap-4 max-lg:grid-cols-1">

          {/* ── Left Sidebar ── */}
          <aside className="max-lg:hidden space-y-4">
            {/* Category list */}
            <div className="bg-white rounded border border-gray-100 overflow-hidden">
              <div className="bg-[#151515] text-white px-4 py-3 text-[12px] font-black uppercase tracking-wider">
                Browse Categories
              </div>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const count = cat.id === 'all'
                  ? publishedProducts.length
                  : publishedProducts.filter((p) => p.product.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setActiveCategory(cat.id); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-[12px] font-semibold border-b border-gray-50 hover:bg-[#f7f7f7] transition-colors ${activeCategory === cat.id ? 'bg-[#f04438]/5 text-[#f04438]' : 'text-[#444]'}`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={14} />
                      {cat.label}
                    </span>
                    <span className="bg-gray-100 text-[10px] font-black text-[#777] px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Promo card */}
            <div className="bg-[#151515] text-white rounded p-4 text-center">
              <Gift size={28} className="mx-auto mb-2 text-[#f04438]" />
              <p className="text-[11px] font-black uppercase tracking-wider mb-1">Special Deals</p>
              <p className="text-[10px] text-gray-300 mb-3">Use code for extra savings</p>
              <div className="bg-[#f04438]/20 border border-[#f04438]/40 rounded px-3 py-2 text-[13px] font-black text-[#f04438] tracking-widest">
                GHANA20
              </div>
            </div>

            {/* On Sale mini list */}
            <div className="bg-white rounded border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3 text-[12px] font-black text-[#151515]">
                On Sale Now
              </div>
              <div className="p-2 space-y-2">
                {topRated.slice(0, 3).map((product, i) => (
                  <ProductCard
                    key={`sale-${product.id}-${i}`}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onBuyNow={handleBuyNow}
                    onOpenDetail={setDetailProduct}
                    horizontal
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* ── Main: Hero + Features ── */}
          <div className="space-y-4">
            {/* Hero banners */}
            <div className="grid grid-cols-[1fr_200px] gap-4 max-sm:grid-cols-1">
              {/* Main hero */}
              <div
                className="relative rounded overflow-hidden bg-cover bg-center min-h-[260px] flex flex-col justify-end p-6"
                style={{ backgroundImage: `url(${heroImage})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#151515]/80 to-transparent" />
                <div className="relative z-10">
                  <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest mb-1">New Collection</p>
                  <h1 className="text-white text-[28px] font-black leading-tight max-w-[260px]">
                    Shop Local.<br />Earn More.
                  </h1>
                  <p className="text-gray-300 text-[12px] mt-2 mb-4">Ghana&apos;s #1 dropshipping platform</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                      className="h-9 rounded bg-[#f04438] px-5 text-[11px] font-black text-white hover:bg-[#c0392b] transition-colors"
                    >
                      Shop Now
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                      className="h-9 rounded border border-white bg-white/10 px-5 text-[11px] font-black text-white hover:bg-white/20 transition-colors"
                    >
                      View All
                    </button>
                  </div>
                </div>
              </div>

              {/* Side banners */}
              <div className="grid grid-rows-2 gap-4 max-sm:hidden">
                <div
                  className="relative rounded overflow-hidden bg-cover bg-center flex flex-col justify-end p-3"
                  style={{ backgroundImage: `url(${heroBanner2})` }}
                >
                  <div className="absolute inset-0 bg-[#151515]/50 rounded" />
                  <div className="relative z-10">
                    <p className="text-white text-[11px] font-black">Electronics</p>
                    <p className="text-[#f04438] text-[10px] font-semibold">Up to 30% off</p>
                  </div>
                </div>
                <div
                  className="relative rounded overflow-hidden bg-cover bg-center flex flex-col justify-end p-3"
                  style={{ backgroundImage: `url(${heroBanner3})` }}
                >
                  <div className="absolute inset-0 bg-[#151515]/50 rounded" />
                  <div className="relative z-10">
                    <p className="text-white text-[11px] font-black">Accessories</p>
                    <p className="text-[#f04438] text-[10px] font-semibold">New arrivals daily</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Phone, title: 'Customer Support', sub: 'Mon–Sat 8am–8pm' },
                { icon: CircleDollarSign, title: 'MoMo Payment', sub: 'Fast & secure' },
                { icon: Tag, title: 'Promo Codes', sub: 'Extra savings daily' },
                { icon: MapPin, title: 'GhanaPost GPS', sub: 'Nationwide delivery' }
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="bg-white rounded border border-gray-100 p-3 flex items-center gap-3">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-[#f04438]/10 grid place-items-center">
                      <Icon size={16} className="text-[#f04438]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-[#151515] truncate">{f.title}</p>
                      <p className="text-[10px] text-[#888]">{f.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Popular Products ── */}
        <section id="products" className="mt-6 bg-white rounded border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-black text-[#151515]">Popular Products</h2>
              <div className="flex h-9 items-center border border-gray-200 rounded overflow-hidden flex-1 max-w-[200px] sm:max-w-xs">
                <Search size={13} className="ml-3 text-gray-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter products..."
                  className="flex-1 min-w-0 px-2 text-[11px] outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(['featured', 'bestseller', 'latest'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`h-8 rounded px-3 sm:px-4 text-[11px] font-black transition-colors ${activeTab === tab ? 'bg-[#f04438] text-white' : 'bg-gray-100 text-[#555] hover:bg-gray-200'}`}
                >
                  {tab === 'featured' ? 'Featured' : tab === 'bestseller' ? 'Best Seller' : 'Latest'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : pagedProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {pagedProducts.map((product, index) => (
                  <ProductCard
                    key={`${product.id}-${index}`}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onBuyNow={handleBuyNow}
                    onOpenDetail={setDetailProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                <Search size={40} className="text-gray-300 mb-4" />
                <p className="font-black text-[#151515] text-lg">No products found</p>
                <p className="mt-2 text-sm text-[#777]">Try a different category or search term.</p>
                <button
                  type="button"
                  onClick={() => { setActiveCategory('all'); setQuery(''); setActiveTab('featured'); }}
                  className="mt-5 h-10 rounded bg-[#f04438] px-6 text-[11px] font-black text-white transition-colors hover:bg-[#c0392b]"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && filteredProducts.length > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-2 pt-8 text-[11px] font-black">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="grid h-8 w-8 place-items-center rounded border border-gray-200 disabled:opacity-30 hover:border-[#f04438] hover:text-[#f04438] transition-colors"
                >
                  <ArrowLeft size={13} />
                </button>
                {pageNumbers.map((page, i) =>
                  page === '...' ? (
                    <span key={`ellipsis-${i}`} className="select-none px-1">...</span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page as number)}
                      className={`grid h-8 w-8 place-items-center rounded border transition-colors ${
                        currentPage === page
                          ? 'border-[#f04438] bg-[#f04438] text-white'
                          : 'border-gray-200 hover:border-[#f04438] hover:text-[#f04438]'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="grid h-8 w-8 place-items-center rounded border border-gray-200 disabled:opacity-30 hover:border-[#f04438] hover:text-[#f04438] transition-colors"
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Sale Banners ── */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { bg: '#151515', title: 'Flash Sale', sub: 'Up to 40% off electronics today', cta: 'Shop Electronics', cat: 'cat-1' },
            { bg: '#f04438', title: 'New Fashion', sub: 'Fresh styles from Accra designers', cta: 'Browse Fashion', cat: 'cat-2' },
            { bg: '#1a1a2e', title: 'Home & Living', sub: 'Transform your space for less', cta: 'Shop Home', cat: 'cat-4' }
          ].map((banner) => (
            <div
              key={banner.cat}
              className="rounded p-6 flex flex-col justify-between min-h-[140px]"
              style={{ backgroundColor: banner.bg }}
            >
              <div>
                <p className="text-white text-[11px] font-black uppercase tracking-widest opacity-70 mb-1">{banner.sub}</p>
                <h3 className="text-white text-[22px] font-black leading-tight">{banner.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => { setActiveCategory(banner.cat); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="mt-4 self-start h-8 rounded bg-white/20 border border-white/40 px-4 text-[11px] font-black text-white hover:bg-white/30 transition-colors"
              >
                {banner.cta} →
              </button>
            </div>
          ))}
        </div>

        {/* ── Our Categories ── */}
        <section className="mt-6 bg-white rounded border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-black text-[#151515]">Our Categories</h2>
            <button type="button" className="text-[11px] font-semibold text-[#f04438] hover:underline">View all →</button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { id: 'cat-1', label: 'Electronics', icon: Zap },
              { id: 'cat-2', label: 'Fashion', icon: Heart },
              { id: 'cat-3', label: 'Beauty', icon: Star },
              { id: 'cat-4', label: 'Home', icon: Package },
              { id: 'cat-5', label: 'Health', icon: Gift },
              { id: 'cat-6', label: 'Food', icon: Tag }
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setActiveCategory(cat.id); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded border border-gray-100 hover:border-[#f04438] hover:shadow-sm transition-all group"
                >
                  <div className="h-10 w-10 rounded-full grid place-items-center bg-[#f04438]/10">
                    <Icon size={20} className="text-[#f04438]" />
                  </div>
                  <span className="text-[11px] font-bold text-[#444] group-hover:text-[#f04438] transition-colors">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Top Rated ── */}
        <section className="mt-6 bg-white rounded border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-[16px] font-black text-[#151515]">Top Rated Products</h2>
            <button
              type="button"
              onClick={() => { setActiveTab('featured'); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-[11px] font-semibold text-[#f04438] hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3">
            {topRated.map((product, i) => (
              <ProductCard
                key={`rated-${product.id}-${i}`}
                product={product}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onOpenDetail={setDetailProduct}
                horizontal
              />
            ))}
          </div>
        </section>

        {/* ── Newsletter CTA ── */}
        <section className="mt-6 bg-gradient-to-r from-[#151515] to-[#2d2d2d] rounded p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-[20px] sm:text-[24px] font-black mb-1">Stay in the Loop</h2>
              <p className="text-gray-300 text-[12px] sm:text-[13px]">Get the latest deals and new arrivals straight to your inbox.</p>
            </div>
            {emailSubmitted ? (
              <div className="flex items-center gap-2 text-sm font-bold text-[#f04438]">
                <CheckCircle2 size={18} />
                Thanks! You&apos;re subscribed.
              </div>
            ) : (
              <form className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto" onSubmit={handleEmailSubmit}>
                <input
                  required
                  type="email"
                  aria-label="Your Email"
                  placeholder="Enter your email address"
                  className="h-11 rounded border border-white/20 bg-white/10 px-4 text-[12px] text-white placeholder:text-gray-400 outline-none focus:border-[#f04438] w-full sm:w-64"
                />
                <button
                  type="submit"
                  className="h-11 rounded bg-[#f04438] px-6 text-[11px] font-black text-white hover:bg-[#c0392b] transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-8 bg-[#151515] text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-10 grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-[16px] font-black mb-1">Local Drop Shipping <span className="text-[#f04438]">GH</span></h3>
            <p className="text-[12px] text-gray-400 leading-relaxed mt-2">
              Ghana&apos;s #1 local dropshipping platform. Connect with verified suppliers and earn commissions via MTN MoMo.
            </p>
            <div className="flex gap-2 mt-4">
              {[
                { label: 'X', url: 'https://twitter.com' },
                { label: 'f', url: 'https://facebook.com' },
                { label: 'in', url: 'https://linkedin.com' },
                { label: 'ig', url: 'https://instagram.com' }
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="grid h-8 w-8 place-items-center rounded bg-white/10 text-[12px] font-black text-white hover:bg-[#f04438] transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-black mb-4 text-gray-200">Quick Links</h4>
            {['Marketplace', 'Start Dropshipping', 'Supplier Portal', 'Admin Panel'].map((link) => (
              <a key={link} href="#" onClick={(e) => e.preventDefault()} className="block text-[12px] text-gray-400 hover:text-white mb-2 transition-colors">
                {link}
              </a>
            ))}
          </div>

          <div>
            <h4 className="text-[13px] font-black mb-4 text-gray-200">Support</h4>
            {['Contact Us', 'Shipping Info', 'Return Policy', 'FAQ', 'Track Order'].map((link) => (
              <a key={link} href="#" onClick={(e) => e.preventDefault()} className="block text-[12px] text-gray-400 hover:text-white mb-2 transition-colors">
                {link}
              </a>
            ))}
          </div>

          <div>
            <h4 className="text-[13px] font-black mb-4 text-gray-200">Contact</h4>
            <div className="space-y-2 text-[12px] text-gray-400">
              <p className="flex items-center gap-2"><Phone size={12} /> +233 55 660 9232</p>
              <p className="flex items-center gap-2"><Phone size={12} /> +233 54 285 5399</p>
              <p className="flex items-center gap-2"><MapPin size={12} /> Accra, Ghana</p>
              <p className="flex items-center gap-2"><Truck size={12} /> Nationwide Delivery</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-[1280px] mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-500">
            <span>© {new Date().getFullYear()} Local Drop Shipping GH. All Rights Reserved.</span>
            <div className="flex gap-6">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
            <span>
              Developed by{' '}
              <a
                href="https://www.ecstasytechnologies.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f04438] hover:underline font-semibold"
              >
                Ecstasy Technologies
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* ── Product Detail Modal ── */}
      {detailProduct && (
        <ProductModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}>
          <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h2 className="text-lg font-black">Shopping Cart</h2>
                <p className="text-xs text-[#777]">{cartCount} item{cartCount === 1 ? '' : 's'}</p>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="grid h-9 w-9 place-items-center rounded border border-gray-200 hover:bg-gray-50">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {cartLines.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <ShoppingCart className="mx-auto text-gray-300" size={42} />
                    <p className="mt-4 font-black">Your cart is empty.</p>
                    <p className="mt-1 text-sm text-[#777]">Add products to start checkout.</p>
                  </div>
                </div>
              ) : (
                cartLines.map((line) => (
                  <div key={line.dropshipperProductId} className="grid grid-cols-[76px_1fr] gap-3 rounded border border-gray-200 p-3">
                    <img src={line.item.product.images[0]} alt={line.item.product.name} className="h-20 w-full bg-gray-100 object-contain p-2 rounded" />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 text-sm font-black leading-tight">{line.item.product.name}</h3>
                        <button type="button" onClick={() => removeFromCart(line.dropshipperProductId)} className="text-gray-400 hover:text-red-600">
                          <X size={15} />
                        </button>
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#777]">{formatMoney(line.item.sellingPrice)}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center overflow-hidden rounded border border-gray-200">
                          <button type="button" onClick={() => updateCartQuantity(line.dropshipperProductId, line.quantity - 1)} className="grid h-8 w-8 place-items-center hover:bg-gray-50">
                            <Minus size={14} />
                          </button>
                          <span className="grid h-8 w-9 place-items-center border-x border-gray-200 text-xs font-black">{line.quantity}</span>
                          <button type="button" onClick={() => updateCartQuantity(line.dropshipperProductId, line.quantity + 1)} className="grid h-8 w-8 place-items-center hover:bg-gray-50">
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="text-sm font-black">{formatMoney(line.item.sellingPrice * line.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-200 p-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#777]">
                  <span>Subtotal</span><span>{formatMoney(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-[#777]">
                  <span>Delivery</span><span>{formatMoney(deliveryFee)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-[#f04438]">
                    <span>Promo ({appliedPromo?.code})</span><span>-{formatMoney(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-black">
                  <span>Total</span><span>{formatMoney(cartTotal)}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={cartLines.length === 0}
                onClick={() => setCheckoutOpen(true)}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-[#f04438] text-sm font-black text-white hover:bg-[#c0392b] disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
              >
                Checkout <ArrowRight size={17} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Checkout Modal ── */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleCheckout} className="w-full max-w-lg rounded bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Checkout</h2>
                <p className="text-xs text-[#777]">Demo checkout — creates a local order.</p>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} className="grid h-9 w-9 place-items-center rounded border border-gray-200 hover:bg-gray-50">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-black text-[#777] mb-1">Promo Code</label>
              {appliedPromo ? (
                <div className="flex items-center justify-between h-11 rounded border border-[#f04438]/30 bg-[#fff5f5] px-4">
                  <span className="text-sm font-black text-[#f04438] flex items-center gap-2">
                    <Tag size={14} />
                    {appliedPromo.code} — {Math.round(appliedPromo.discount * 100)}% off applied!
                  </span>
                  <button type="button" onClick={() => { clearPromo(); setPromoInput(''); setPromoError(''); }} className="text-gray-400 hover:text-[#f04438]">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value); setPromoError(''); }}
                    placeholder="e.g. GHANA20"
                    className="flex-1 h-11 rounded border border-gray-200 px-4 text-sm text-[#1c1c1c] outline-none focus:border-[#f04438] uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="h-11 rounded border border-[#f04438] bg-[#f04438] px-4 text-[11px] font-black text-white hover:bg-[#c0392b] transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
              {promoError && <p className="mt-1 text-xs text-[#f04438]">{promoError}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { name: 'fullName', label: 'Full name', value: 'Ama Mensah' },
                { name: 'phone', label: 'Phone', value: '+233244123456' },
                { name: 'region', label: 'Region', value: 'Greater Accra' },
                { name: 'city', label: 'City', value: 'Accra' },
                { name: 'ghanaPostGps', label: 'GhanaPost GPS', value: 'GA-184-9022' },
                { name: 'momoNumber', label: 'MoMo number', value: '+233244123456' }
              ].map((f) => (
                <label key={f.name} className="grid gap-1 text-xs font-black text-[#777]">
                  {f.label}
                  <input name={f.name} defaultValue={f.value} required className="h-11 rounded border border-gray-200 px-4 text-sm text-[#1c1c1c] outline-none focus:border-[#f04438]" />
                </label>
              ))}
            </div>

            <label className="mt-3 grid gap-1 text-xs font-black text-[#777]">
              Delivery note
              <textarea name="notes" rows={3} className="rounded border border-gray-200 px-4 py-3 text-sm text-[#1c1c1c] outline-none focus:border-[#f04438]" />
            </label>

            <div className="mt-5 rounded bg-gray-50 p-4 space-y-1">
              <div className="flex justify-between text-sm text-[#777]">
                <span>Subtotal</span><span>{formatMoney(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#777]">
                <span>Delivery</span><span>{formatMoney(deliveryFee)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-[#f04438]">
                  <span>Promo ({appliedPromo?.code})</span><span>-{formatMoney(promoDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-2">
                <span>Total payable</span><span>{formatMoney(cartTotal)}</span>
              </div>
              <p className="mt-1 text-xs text-[#777]">Payment: MTN MoMo (demo)</p>
            </div>

            <button type="submit" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-[#f04438] text-sm font-black text-white hover:bg-[#c0392b] transition-colors">
              Place Order <CreditCard size={17} />
            </button>
          </form>
        </div>
      )}

      {/* ── Order success toast ── */}
      {orderNumber && (
        <div className="fixed bottom-5 left-1/2 z-[70] w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded border border-[#f04438]/20 bg-white p-4 shadow-2xl">
          <div className="flex gap-3">
            <CheckCircle2 className="shrink-0 text-[#f04438]" size={24} />
            <div className="min-w-0">
              <p className="font-black text-[#1c1c1c]">Order placed: {orderNumber}</p>
              <p className="mt-1 text-xs leading-5 text-[#777]">Your order has been placed and cart cleared.</p>
            </div>
            <button type="button" onClick={() => setOrderNumber(null)} className="ml-auto text-gray-400 hover:text-[#1c1c1c]">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Click-away for account dropdown */}
      {accountOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
      )}
    </main>
  );
};
