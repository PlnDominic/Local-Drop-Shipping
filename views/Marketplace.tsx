'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Folder,
  Home,
  Minus,
  Music,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  User,
  X
} from 'lucide-react';
import { useGlobalStore } from '../store/globalStore';
import type { DropshipperProduct, ProductReview } from '../store/globalStore';
import { useToast } from '../components/Toast';

const heroImage =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=90';

const PAGE_SIZE = 6;

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

const StarDisplay: React.FC<{ rating: number; size?: number }> = ({ rating, size = 13 }) => {
  return (
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
};

// ── Skeleton loader ──
const SkeletonCard: React.FC = () => (
  <div className="min-w-0 animate-pulse">
    <div className="aspect-[1/0.92] bg-gray-200" />
    <div className="pt-3 space-y-2">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-9 bg-gray-200 rounded" />
        <div className="h-9 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

// ── Product Detail Modal ──
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
      <div className="relative w-full max-w-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center border border-gray-200 bg-white hover:bg-gray-50"
        >
          <X size={18} />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div className="bg-[#f2f2f2] aspect-square flex items-center justify-center p-8">
            <img
              src={product.product.images[0]}
              alt={product.product.name}
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-black text-[#777] uppercase tracking-wider">
                {getCategoryLabel(product.product.categoryId)}
              </span>
              <h2 className="mt-1 text-[20px] font-black leading-tight text-[#151515]">
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
              <strong className="text-2xl font-black text-[#151515]">{formatMoney(product.sellingPrice)}</strong>
              <span className="text-xs text-[#777]">{product.product.stockQty} in stock</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { onAddToCart(product.id); onClose(); }}
                className="h-10 border border-[#dedede] bg-white px-3 text-[11px] font-black text-[#151515] transition-colors hover:border-[#191919]"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => { onBuyNow(product.id); onClose(); }}
                className="h-10 border border-[#191919] bg-[#191919] px-3 text-[11px] font-black text-white transition-colors hover:bg-black"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Reviews section */}
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
  compact?: boolean;
  onAddToCart: (id: string) => void;
  onBuyNow: (id: string) => void;
  onOpenDetail: (product: DropshipperProduct) => void;
}> = ({ product, compact = false, onAddToCart, onBuyNow, onOpenDetail }) => {
  const reviews = product.product.reviews || [];
  const avgRating = computeAvgRating(reviews);

  return (
    <article className="min-w-0">
      <div
        className={`relative overflow-hidden bg-[#f2f2f2] ${compact ? 'aspect-[1.55/1]' : 'aspect-[1/0.92]'} cursor-pointer`}
        onClick={() => onOpenDetail(product)}
      >
        <span className="absolute right-2.5 top-2.5 z-10 grid min-w-[58px] place-items-center border border-[#d8d8d8] bg-white/95 px-3 py-1 text-[11px] font-black text-[#222] shadow-sm">
          {getCategoryLabel(product.product.categoryId)}
        </span>
        <img
          src={product.product.images[0]}
          alt={product.product.name}
          className="h-full w-full object-contain p-6 mix-blend-multiply transition-transform duration-500 hover:scale-105"
        />
      </div>
      <div className="pt-3">
        <h3
          className="line-clamp-1 text-[19px] font-black leading-tight tracking-normal text-[#151515] cursor-pointer hover:underline"
          onClick={() => onOpenDetail(product)}
        >
          {product.product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-[#777]">
            <StarDisplay rating={avgRating} />
            {avgRating.toFixed(1)} ({reviews.length})
          </span>
          <strong className="whitespace-nowrap text-[18px] font-black text-[#151515]">
            {formatMoney(product.sellingPrice)}
          </strong>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAddToCart(product.id)}
            className="h-9 border border-[#dedede] bg-white px-3 text-[11px] font-black text-[#151515] transition-colors hover:border-[#191919]"
          >
            Add to Cart
          </button>
          <button
            type="button"
            onClick={() => onBuyNow(product.id)}
            className="h-9 border border-[#191919] bg-[#191919] px-3 text-[11px] font-black text-white transition-colors hover:bg-black"
          >
            Buy Now
          </button>
        </div>
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

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortMode, setSortMode] = useState<'default' | 'new' | 'bestseller' | 'discount'>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [detailProduct, setDetailProduct] = useState<DropshipperProduct | null>(null);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const recsRef = useRef<HTMLDivElement>(null);

  // 1-second skeleton on mount
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [activeCategory, sortMode, query]);

  const publishedProducts = useMemo(
    () => dropshipperProducts.filter((item) => item.isPublished),
    [dropshipperProducts]
  );
  const catalogProducts = useMemo(
    () => [...publishedProducts, ...publishedProducts.slice().reverse(), ...publishedProducts.slice(0, 1)],
    [publishedProducts]
  );
  const recommendations = useMemo(() => [...publishedProducts].reverse(), [publishedProducts]);

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

    if (sortMode === 'bestseller') {
      result = [...result].sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (sortMode === 'discount') {
      result = [...result].sort(
        (a, b) =>
          (b.product.suggestedPrice - b.sellingPrice) -
          (a.product.suggestedPrice - a.sellingPrice)
      );
    }

    return result;
  }, [activeCategory, catalogProducts, query, sortMode]);

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

  const focusSearch = () => {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => searchInputRef.current?.focus(), 400);
  };

  const scrollRecs = (dir: 'left' | 'right') => {
    recsRef.current?.scrollBy({ left: dir === 'right' ? 360 : -360, behavior: 'smooth' });
  };

  const handleSortToggle = (mode: 'new' | 'bestseller' | 'discount') => {
    setSortMode((prev) => (prev === mode ? 'default' : mode));
  };

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailSubmitted(true);
    setTimeout(() => setEmailSubmitted(false), 3000);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-white text-[#1c1c1c]">
      <section className="w-full overflow-hidden bg-white">

        {/* ── Navbar ── */}
        <header className="relative z-20 grid h-[74px] w-full grid-cols-[1fr_auto_1fr] items-center bg-white px-10 max-sm:grid-cols-[1fr_auto] max-sm:px-4">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="inline-flex items-center gap-2 text-[17px] font-black text-[#151515]"
          >
            <span className="text-primary">Local Drop Shipping <span className="text-accent">GH</span></span>
          </a>

          <nav className="flex items-center gap-8 text-xs font-black max-sm:hidden">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-primary transition-colors">Marketplace</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Start Dropshipping</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Supplier Portal</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">Admin Panel</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary transition-colors">API Docs & ERD</a>
          </nav>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              aria-label="Search"
              onClick={focusSearch}
              className="grid h-10 w-10 place-items-center border border-[#ededed] transition-colors hover:bg-[#f5f5f5]"
            >
              <Search size={20} />
            </button>
            <button
              type="button"
              aria-label="Cart"
              onClick={() => setCartOpen(true)}
              className="relative grid h-10 w-10 place-items-center border border-[#ededed] transition-colors hover:bg-[#f5f5f5]"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-1 grid h-[17px] min-w-[17px] place-items-center bg-[#f04438] px-1 text-[9px] font-black text-white">
                  {cartCount}
                </span>
              )}
            </button>
            <div className="relative">
              <button
                type="button"
                aria-label="Account"
                onClick={() => setAccountOpen((v) => !v)}
                className="grid h-10 w-10 place-items-center border border-[#ededed] transition-colors hover:bg-[#f5f5f5]"
              >
                <User size={18} />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 border border-[#ededed] bg-white shadow-lg">
                  <div className="border-b border-[#ededed] px-4 py-3">
                    <p className="text-sm font-black text-[#151515]">Ama Mensah</p>
                    <p className="text-[11px] text-[#777]">ama.mensah@gmail.com</p>
                  </div>
                  <div className="py-1">
                    {['My Orders', 'Wishlist', 'Settings', 'Sign Out'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setAccountOpen(false)}
                        className="w-full px-4 py-2 text-left text-[12px] font-semibold text-[#333] hover:bg-[#f5f5f5]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section
          className="-mt-[74px] flex h-[355px] items-end justify-center overflow-hidden bg-cover bg-center max-sm:h-[270px]"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <h1 className="relative mb-[-54px] text-[clamp(120px,18vw,245px)] font-black leading-[0.72] tracking-normal text-white">
            Shop
          </h1>
        </section>

        {/* ── Shop section ── */}
        <section id="shop" className="relative z-10 -mt-7 w-full bg-white pt-6">
          <div className="flex items-center justify-between gap-6 px-10 pb-12 max-lg:flex-col max-lg:items-start max-sm:px-4">
            <h2 className="text-[25px] font-black text-[#171717]">Give All You Need</h2>
            <form
              className="flex h-[31px] w-[410px] items-center gap-2 border border-[#ececec] py-0.5 pl-3 pr-1 max-lg:w-full"
              onSubmit={(e) => e.preventDefault()}
            >
              <Search size={15} className="text-[#a5a5a5]" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search products"
                placeholder="Search products..."
                className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#a5a5a5]"
              />
              <button type="submit" className="h-[25px] bg-[#171717] px-5 text-[10px] font-black text-white hover:bg-black transition-colors">
                Search
              </button>
            </form>
          </div>

          <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-7 px-10 max-lg:grid-cols-1 max-sm:px-4">
            {/* ── Sidebar ── */}
            <aside className="max-lg:hidden">
              <h3 className="mb-4 text-[17px] font-black">Category</h3>
              <div className="grid gap-1">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`grid h-8 grid-cols-[18px_16px_1fr_auto_auto] items-center gap-2 text-left text-[11px] font-bold px-1 ${
                    activeCategory === 'all' ? 'bg-[#f0f0f0] text-[#202020]' : 'text-[#555] hover:bg-[#fafafa]'
                  }`}
                >
                  <span />
                  <Folder size={16} />
                  <span>All Product</span>
                  <b className="grid h-5 min-w-5 place-items-center bg-[#ff4d5e] px-1 text-[10px] font-black text-white">
                    {publishedProducts.length}
                  </b>
                  <ChevronDown size={13} />
                </button>

                {[
                  { id: 'cat-4', label: 'For Home', icon: Home },
                  { id: 'cat-1', label: 'For Music', icon: Music },
                  { id: 'cat-6', label: 'For Phone', icon: Phone },
                  { id: 'cat-5', label: 'For Storage', icon: SlidersHorizontal }
                ].map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCategory(category.id)}
                      className={`grid h-8 grid-cols-[18px_16px_1fr_auto] items-center gap-2 text-left text-[11px] font-bold px-1 ${
                        activeCategory === category.id ? 'bg-[#f0f0f0] text-[#202020]' : 'text-[#555] hover:bg-[#fafafa]'
                      }`}
                    >
                      <span
                        className="w-[18px] justify-self-end border-b border-l border-[#d8d8d8]"
                        style={{ height: index < 3 ? '34px' : 0, marginTop: index < 3 ? '-15px' : 0 }}
                      />
                      <Icon size={16} />
                      <span>{category.label}</span>
                      {index === 0 ? <ChevronDown size={13} /> : null}
                    </button>
                  );
                })}

                {([
                  { key: 'new', label: 'New Arrival', icon: Search },
                  { key: 'bestseller', label: 'Best Seller', icon: Sparkles },
                  { key: 'discount', label: 'On Discount', icon: CircleDollarSign }
                ] as const).map((item) => {
                  const Icon = item.icon;
                  const active = sortMode === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSortToggle(item.key)}
                      className={`grid h-8 grid-cols-[18px_16px_1fr_auto] items-center gap-2 text-left text-[11px] font-bold px-1 ${
                        active ? 'bg-[#f0f0f0] text-[#202020]' : 'text-[#555] hover:bg-[#fafafa]'
                      }`}
                    >
                      <span />
                      <Icon size={16} />
                      <span>{item.label}</span>
                      <ChevronDown size={13} className={active ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* ── Product grid ── */}
            <div>
              {isLoading ? (
                <div className="grid grid-cols-3 gap-x-7 gap-y-10 max-lg:grid-cols-2 max-sm:grid-cols-1">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : pagedProducts.length > 0 ? (
                <div className="grid grid-cols-3 gap-x-7 gap-y-10 max-lg:grid-cols-2 max-sm:grid-cols-1">
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
                <div className="flex flex-col items-center justify-center border border-dashed border-[#d8d8d8] p-16 text-center">
                  <Search size={40} className="text-[#d8d8d8] mb-4" />
                  <p className="font-black text-[#151515] text-lg">No products found</p>
                  <p className="mt-2 text-sm text-[#777]">Try a different category or search term.</p>
                  <button
                    type="button"
                    onClick={() => { setActiveCategory('all'); setQuery(''); setSortMode('default'); }}
                    className="mt-5 h-10 border border-[#191919] bg-[#191919] px-6 text-[11px] font-black text-white transition-colors hover:bg-black"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* ── Pagination ── */}
              {!isLoading && (
                <div className="flex items-center justify-between gap-5 py-16 text-[11px] font-black">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-2 disabled:opacity-30 hover:opacity-70 transition-opacity"
                  >
                    <ArrowLeft size={14} />
                    Previous
                  </button>
                  <div className="flex items-center gap-3">
                    {pageNumbers.map((page, i) =>
                      page === '...' ? (
                        <span key={`ellipsis-${i}`} className="select-none">...</span>
                      ) : (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page as number)}
                          className={`grid h-8 w-8 place-items-center transition-colors ${
                            currentPage === page ? 'bg-[#191919] text-white' : 'bg-[#f0f0f0] hover:bg-[#e0e0e0]'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-2 disabled:opacity-30 hover:opacity-70 transition-opacity"
                  >
                    Next
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Recommendations ── */}
        <section className="w-full overflow-hidden px-10 pb-[94px] max-sm:px-4">
          <div className="mb-9 flex items-center justify-between gap-6">
            <h2 className="text-[34px] font-black text-[#171717]">Explore our recommendations</h2>
            <div className="flex items-center gap-7">
              <button
                type="button"
                aria-label="Previous recommendation"
                onClick={() => scrollRecs('left')}
                className="hover:opacity-60 transition-opacity"
              >
                <ArrowLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="Next recommendation"
                onClick={() => scrollRecs('right')}
                className="hover:opacity-60 transition-opacity"
              >
                <ArrowRight size={22} />
              </button>
            </div>
          </div>
          <div
            ref={recsRef}
            className="grid auto-cols-[330px] grid-flow-col gap-7 overflow-x-auto pb-2 max-sm:auto-cols-[82vw]"
            style={{ scrollbarWidth: 'none' }}
          >
            {recommendations.concat(recommendations).map((product, index) => (
              <ProductCard
                key={`rec-${product.id}-${index}`}
                product={product}
                compact
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onOpenDetail={setDetailProduct}
              />
            ))}
          </div>
        </section>

        {/* ── CTA / Blog ── */}
        <section
          id="blog"
          className="mx-8 mb-16 grid min-h-[234px] grid-cols-[1.1fr_0.9fr] items-end gap-11 bg-gradient-to-b from-[#373737] to-[#111] p-8 text-white max-lg:grid-cols-1 max-sm:mx-4"
        >
          <div>
            <h2 className="mb-9 text-[43px] font-black leading-[0.95] tracking-normal max-sm:text-[34px]">
              Ready to Get<br />Our New Stuff?
            </h2>
            {emailSubmitted ? (
              <div className="flex items-center gap-2 text-sm font-bold text-accent">
                <CheckCircle2 size={18} />
                Thanks! You're subscribed.
              </div>
            ) : (
              <form
                className="flex h-[31px] w-[230px] items-center bg-white p-[3px]"
                onSubmit={handleEmailSubmit}
              >
                <input
                  required
                  type="email"
                  aria-label="Your Email"
                  placeholder="Your Email"
                  className="min-w-0 flex-1 px-4 text-[10px] text-[#111] outline-none"
                />
                <button
                  type="submit"
                  className="h-[25px] bg-[#171717] px-4 text-[10px] font-black text-white hover:bg-black transition-colors"
                >
                  Send
                </button>
              </form>
            )}
          </div>
          <div className="pb-3 pr-10 max-lg:p-0">
            <h3 className="mb-3 text-[13px] font-black">Local Drop Shipping GH</h3>
            <p className="max-w-[350px] text-xs leading-7 text-[#e7e7e7]">
              Ghana's #1 local dropshipping platform. Connect with verified suppliers, import products instantly, and earn commissions via MoMo.
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="mb-14 grid w-full grid-cols-[1fr_auto] gap-8 px-10 max-lg:grid-cols-1 max-sm:px-4">
          <div className="flex gap-[105px] max-sm:gap-14">
            <div>
              <h3 className="mb-6 text-[17px] font-black">About</h3>
              <a href="#blog" onClick={(e) => { e.preventDefault(); scrollTo('blog'); }} className="mb-3 block text-[13px] font-semibold text-[#606060] hover:text-[#151515]">Blog</a>
              <a href="#blog" onClick={(e) => { e.preventDefault(); scrollTo('blog'); }} className="mb-3 block text-[13px] font-semibold text-[#606060] hover:text-[#151515]">Meet The Team</a>
              <a href="#blog" onClick={(e) => { e.preventDefault(); scrollTo('blog'); }} className="block text-[13px] font-semibold text-[#606060] hover:text-[#151515]">Contact Us</a>
            </div>
            <div>
              <h3 className="mb-6 text-[17px] font-black">Support</h3>
              <a href="#blog" onClick={(e) => { e.preventDefault(); scrollTo('blog'); }} className="mb-3 block text-[13px] font-semibold text-[#606060] hover:text-[#151515]">Contact Us</a>
              <a href="#shop" onClick={(e) => { e.preventDefault(); scrollTo('shop'); }} className="mb-3 block text-[13px] font-semibold text-[#606060] hover:text-[#151515]">Shipping</a>
              <a href="#shop" onClick={(e) => { e.preventDefault(); scrollTo('shop'); }} className="mb-3 block text-[13px] font-semibold text-[#606060] hover:text-[#151515]">Return</a>
              <a href="#shop" onClick={(e) => { e.preventDefault(); scrollTo('shop'); }} className="block text-[13px] font-semibold text-[#606060] hover:text-[#151515]">FAQ</a>
            </div>
          </div>

          <div className="self-end text-[13px] font-bold text-[#8d8d8d]">
            <span>Social Media</span>
            <div className="mt-3 flex items-center gap-3">
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
                  className="grid h-10 w-10 place-items-center bg-[#171717] text-base font-black text-white hover:bg-[#333] transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </footer>

        <div className="flex h-[68px] items-center justify-between border-t border-[#ededed] px-16 text-[11px] font-bold text-[#8a8a8a] max-sm:h-auto max-sm:flex-col max-sm:items-start max-sm:gap-4 max-sm:p-6">
          <span>Copyright 2023 Uranghu. All Rights Reserved.</span>
          <div className="flex gap-10 text-[#303030]">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:underline">Terms of Service</a>
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:underline">Privacy Policy</a>
          </div>
        </div>
      </section>

      {/* ── Product Detail Modal ── */}
      {detailProduct && (
        <ProductModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      )}

      {/* ── Cart drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}>
          <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h2 className="text-lg font-black">Shopping cart</h2>
                <p className="text-xs text-[#777]">{cartCount} item{cartCount === 1 ? '' : 's'} selected</p>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="grid h-9 w-9 place-items-center border border-gray-200 hover:bg-gray-50">
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
                  <div key={line.dropshipperProductId} className="grid grid-cols-[76px_1fr] gap-3 border border-gray-200 p-3">
                    <img src={line.item.product.images[0]} alt={line.item.product.name} className="h-20 w-full bg-gray-100 object-contain p-2" />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 text-sm font-black leading-tight">{line.item.product.name}</h3>
                        <button type="button" onClick={() => removeFromCart(line.dropshipperProductId)} className="text-gray-400 hover:text-red-600">
                          <X size={15} />
                        </button>
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#777]">{formatMoney(line.item.sellingPrice)}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center overflow-hidden border border-gray-200">
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
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#191919] text-sm font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
              >
                Checkout
                <ArrowRight size={17} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Checkout modal ── */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleCheckout} className="w-full max-w-lg bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Checkout</h2>
                <p className="text-xs text-[#777]">Demo checkout creates an order in local state.</p>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} className="grid h-9 w-9 place-items-center border border-gray-200 hover:bg-gray-50">
                <X size={18} />
              </button>
            </div>

            {/* Promo code field */}
            <div className="mb-4">
              <label className="block text-xs font-black text-[#777] mb-1">Promo Code</label>
              {appliedPromo ? (
                <div className="flex items-center justify-between h-11 border border-[#f04438]/30 bg-[#fff5f5] px-4">
                  <span className="text-sm font-black text-[#f04438] flex items-center gap-2">
                    <Tag size={14} />
                    {appliedPromo.code} — {Math.round(appliedPromo.discount * 100)}% off applied!
                  </span>
                  <button
                    type="button"
                    onClick={() => { clearPromo(); setPromoInput(''); setPromoError(''); }}
                    className="text-gray-400 hover:text-[#f04438]"
                  >
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
                    className="flex-1 h-11 border border-gray-200 px-4 text-sm text-[#1c1c1c] outline-none focus:border-[#191919] uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="h-11 border border-[#191919] bg-[#191919] px-4 text-[11px] font-black text-white hover:bg-black transition-colors"
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
                  <input name={f.name} defaultValue={f.value} required className="h-11 border border-gray-200 px-4 text-sm text-[#1c1c1c] outline-none focus:border-[#191919]" />
                </label>
              ))}
            </div>

            <label className="mt-3 grid gap-1 text-xs font-black text-[#777]">
              Delivery note
              <textarea name="notes" rows={3} className="border border-gray-200 px-4 py-3 text-sm text-[#1c1c1c] outline-none focus:border-[#191919]" />
            </label>

            <div className="mt-5 bg-gray-50 p-4 space-y-1">
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
              <p className="mt-1 text-xs text-[#777]">Payment provider: MTN MoMo demo</p>
            </div>

            <button type="submit" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#191919] text-sm font-black text-white hover:bg-black transition-colors">
              Place order
              <CreditCard size={17} />
            </button>
          </form>
        </div>
      )}

      {/* ── Order success toast ── */}
      {orderNumber && (
        <div className="fixed bottom-5 left-1/2 z-[70] w-[calc(100%-32px)] max-w-md -translate-x-1/2 border border-accent/20 bg-white p-4 shadow-2xl">
          <div className="flex gap-3">
            <CheckCircle2 className="shrink-0 text-accent" size={24} />
            <div className="min-w-0">
              <p className="font-black text-[#1c1c1c]">Order placed: {orderNumber}</p>
              <p className="mt-1 text-xs leading-5 text-[#777]">Your checkout created an order and cleared the cart.</p>
            </div>
            <button type="button" onClick={() => setOrderNumber(null)} className="ml-auto text-gray-400 hover:text-[#1c1c1c]">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Click-away for account dropdown ── */}
      {accountOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
      )}
    </main>
  );
};
