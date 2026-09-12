'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Heart,
  MapPin,
  Minus,
  MessageCircle,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  X,
  Instagram,
  Facebook,
  Twitter,
  ExternalLink,
} from 'lucide-react';
import {
  getCategories,
  getDropshipperStoreBySlug,
  getPublishedDropshipperProducts,
} from '../lib/supabase/queries';
import type { Category } from '../lib/supabase/types';
import type { DropshipperProduct, DropshipperStoreProfile } from '../lib/api/types';
import { useToast } from '../components/Toast';

const formatMoney = (amount: number) =>
  `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const StarDisplay: React.FC<{ rating: number; size?: number; color?: string }> = ({ rating, size = 13, color = '#f5a524' }) => (
  <span className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        fill={n <= Math.round(rating) ? color : 'none'}
        stroke={n <= Math.round(rating) ? color : '#ccc'}
        strokeWidth={1.5}
      />
    ))}
  </span>
);

interface CartLine {
  dropshipperProductId: string;
  quantity: number;
}

const ProductModal: React.FC<{
  product: DropshipperProduct;
  themeColor: string;
  onClose: () => void;
  onAddToCart: (id: string) => void;
  onBuyNow: (id: string) => void;
}> = ({ product, themeColor, onClose, onAddToCart, onBuyNow }) => {
  const discount = product.product.suggestedPrice > product.sellingPrice
    ? Math.round(((product.product.suggestedPrice - product.sellingPrice) / product.product.suggestedPrice) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl bg-white shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
        >
          <X size={18} />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="bg-[#f7f7f7] aspect-square flex items-center justify-center p-8 rounded-tl-xl md:rounded-bl-xl">
            <img
              src={product.product.images[0] || 'https://via.placeholder.com/300x300?text=No+Image'}
              alt={product.product.name}
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <span
                className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2"
                style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
              >
                {product.product.categorySlug || 'Product'}
              </span>
              <h2 className="text-[20px] font-black leading-tight text-[#151515]">
                {product.product.name}
              </h2>
              <p className="mt-1 text-xs text-[#777]">By {product.product.supplierName}</p>
            </div>
            <p className="text-sm leading-relaxed text-[#444]">
              {product.customDescription || product.product.description}
            </p>
            <div className="flex items-center gap-3">
              <StarDisplay rating={0} size={16} color={themeColor} />
              <span className="text-xs font-bold text-[#777]">No reviews yet</span>
            </div>
            <div className="flex items-center gap-2">
              <strong className="text-2xl font-black" style={{ color: themeColor }}>
                {formatMoney(product.sellingPrice)}
              </strong>
              {discount > 0 && (
                <span className="text-sm text-[#bbb] line-through">{formatMoney(product.product.suggestedPrice)}</span>
              )}
            </div>
            {product.product.stockQty > 0 ? (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {product.product.stockQty} in stock
              </p>
            ) : (
              <p className="text-xs text-red-500 font-semibold">Out of stock</p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-auto pt-4">
              <button
                type="button"
                onClick={() => { onAddToCart(product.id); onClose(); }}
                className="h-11 rounded-lg border border-[#151515] bg-white px-3 text-[11px] font-black text-[#151515] transition-colors hover:bg-gray-50"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => { onBuyNow(product.id); onClose(); }}
                disabled={product.product.stockQty <= 0}
                style={{ backgroundColor: themeColor }}
                className="h-11 rounded-lg px-3 text-[11px] font-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{
  product: DropshipperProduct;
  themeColor: string;
  isFeatured?: boolean;
  onAddToCart: (id: string) => void;
  onOpenDetail: (product: DropshipperProduct) => void;
}> = ({ product, themeColor, isFeatured, onAddToCart, onOpenDetail }) => {
  const discount = product.product.suggestedPrice > product.sellingPrice
    ? Math.round(((product.product.suggestedPrice - product.sellingPrice) / product.product.suggestedPrice) * 100)
    : 0;

  return (
    <article className="group min-w-0 bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col">
      <div
        className="relative overflow-hidden bg-[#f7f7f7] aspect-square cursor-pointer"
        onClick={() => onOpenDetail(product)}
      >
        {discount > 0 && (
          <span
            className="absolute left-2.5 top-2.5 z-10 px-2 py-0.5 text-[10px] font-black text-white rounded-full shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            -{discount}%
          </span>
        )}
        {isFeatured && (
          <span
            className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 px-2 py-0.5 text-[9px] font-black text-white rounded-full shadow-sm"
            style={{ backgroundColor: '#151515' }}
          >
            <Sparkles size={10} style={{ color: themeColor }} /> Featured
          </span>
        )}
        <button
          type="button"
          aria-label="Wishlist"
          onClick={(e) => { e.stopPropagation(); }}
          className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
          style={isFeatured ? { top: '32px' } : undefined}
        >
          <Heart size={13} className="text-gray-400 hover:text-red-500 transition-colors" />
        </button>
        <img
          src={product.product.images[0] || 'https://via.placeholder.com/300x300?text=No+Image'}
          alt={product.product.name}
          className="h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <span className="text-[9px] font-bold text-[#777] uppercase tracking-wider">
          {product.product.categorySlug || 'Product'}
        </span>
        <h3
          className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-[#151515] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onOpenDetail(product)}
        >
          {product.product.name}
        </h3>
        <div className="mt-1 flex items-center gap-1">
          <StarDisplay rating={0} size={10} color={themeColor} />
          <span className="text-[10px] text-[#999]">(0)</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[15px] font-black" style={{ color: themeColor }}>
            {formatMoney(product.sellingPrice)}
          </span>
          {discount > 0 && (
            <span className="text-[11px] text-[#bbb] line-through">{formatMoney(product.product.suggestedPrice)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAddToCart(product.id)}
          className="mt-3 w-full h-9 rounded-lg bg-[#151515] text-[11px] font-black text-white transition-all hover:shadow-md"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = themeColor; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#151515'; }}
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
};

export const DropshipperStorefront: React.FC<{ storeSlug: string }> = ({ storeSlug }) => {
  const { showToast } = useToast();

  const [store, setStore] = useState<DropshipperStoreProfile | null>(null);
  const [products, setProducts] = useState<DropshipperProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Announcement dismissal
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // UI state
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<DropshipperProduct | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);

  // ── Fetch store data ──
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [storeRes, catsRes] = await Promise.all([
          getDropshipperStoreBySlug(storeSlug),
          getCategories(),
        ]);

        if (!active) return;

        if (!storeRes) {
          setError('Store not found');
          setLoading(false);
          return;
        }

        setStore(storeRes);
        setCategories(catsRes);

        const productsRes = await getPublishedDropshipperProducts(storeRes.id);
        if (active) setProducts(productsRes);
      } catch (e) {
        if (active) {
          setError((e as Error)?.message ?? 'Failed to load store');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => { active = false; };
  }, [storeSlug]);

  const themeColor = store?.themeColor || '#f04438';

  // ── Cart operations ──
  const cartLines = cart.map((line) => {
    const item = products.find((p) => p.id === line.dropshipperProductId);
    return item ? { ...line, item } : null;
  }).filter(Boolean) as Array<CartLine & { item: DropshipperProduct }>;

  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const cartSubtotal = cartLines.reduce((sum, l) => sum + l.item.sellingPrice * l.quantity, 0);
  const deliveryFee = cartSubtotal > 0 ? 25 : 0;
  const cartTotal = cartSubtotal + deliveryFee;

  const addToCart = (dropshipperProductId: string) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.dropshipperProductId === dropshipperProductId);
      if (existing) {
        return prev.map((l) =>
          l.dropshipperProductId === dropshipperProductId
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }
      return [...prev, { dropshipperProductId, quantity: 1 }];
    });
    setCartOpen(true);
    showToast('Added to cart!', 'success');
  };

  const removeFromCart = (dropshipperProductId: string) => {
    setCart((prev) => prev.filter((l) => l.dropshipperProductId !== dropshipperProductId));
  };

  const updateCartQuantity = (dropshipperProductId: string, qty: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.dropshipperProductId === dropshipperProductId
          ? { ...l, quantity: Math.max(1, qty) }
          : l
      )
    );
  };

  const clearCart = () => setCart([]);

  const handleBuyNow = (dropshipperProductId: string) => {
    addToCart(dropshipperProductId);
    setCartOpen(true);
    setCheckoutOpen(true);
  };

  const handleCheckout = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const orderNum = `LDK-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderNumber(orderNum);
    setCheckoutOpen(false);
    setCartOpen(false);
    clearCart();
    showToast('Order placed successfully!', 'success');
  };

  // ── Featured products ──
  const featuredProducts = useMemo(() => {
    if (!store?.featuredProductIds || store.featuredProductIds.length === 0) return [];
    return products.filter((p) => store.featuredProductIds.includes(p.id) || store.featuredProductIds.includes(p.productId));
  }, [products, store?.featuredProductIds]);

  // ── Filter products by search & category ──
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.product.categoryId === activeCategory;
      const matchesSearch =
        q.length === 0 ||
        item.product.name.toLowerCase().includes(q) ||
        item.customDescription.toLowerCase().includes(q) ||
        item.product.supplierName.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, query]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div
          className="h-9 w-9 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${themeColor} transparent ${themeColor} ${themeColor}` }}
        />
      </div>
    );
  }

  // ── Store not found ──
  if (error || !store) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4">
            <X size={28} />
          </div>
          <h1 className="text-2xl font-black text-[#151515]">Store Not Found</h1>
          <p className="mt-2 text-sm text-[#777]">
            {error ?? 'The storefront you are looking for does not exist or has been disabled.'}
          </p>
          <Link
            href="/"
            className="mt-5 inline-block h-11 rounded-lg px-6 text-[12px] font-black text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#151515' }}
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const storeLogo = store.logoUrl || '/logo-placeholder.png';
  const whatsappUrl = store.whatsapp
    ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${store.storeName || store.businessName}, I am browsing your store!`)}`
    : null;

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#1c1c1c] font-sans flex flex-col">

      {/* ── 1. Announcement Bar ── */}
      {store.announcement && !announcementDismissed && (
        <aside
          aria-label="Announcement"
          className="relative text-white py-2 px-4 text-center text-xs font-bold tracking-wide transition-all"
          style={{ backgroundColor: themeColor }}
        >
          <div className="max-w-[1280px] mx-auto flex items-center justify-center gap-2 pr-6">
            <span>📢 {store.announcement}</span>
          </div>
          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-1"
          >
            <X size={14} />
          </button>
        </aside>
      )}

      {/* ── 2. Store Header ── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group text-[#777] hover:text-[#151515] transition-colors">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[11px] font-semibold hidden sm:inline">Back to marketplace</span>
          </Link>

          {/* Store branding */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 shadow-xs">
              <img
                src={storeLogo}
                alt={store.storeName || store.businessName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/150?text=' +
                    encodeURIComponent(store.storeName?.[0] || 'S');
                }}
              />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#151515] leading-tight">
                {store.storeName || store.businessName}
              </h1>
              {store.location && (
                <div className="flex items-center gap-1 text-[10px] text-[#999]">
                  <MapPin size={10} /> {store.location}
                </div>
              )}
            </div>
          </div>

          {/* Cart & Contact Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            <div className="relative">
              <button
                type="button"
                aria-label="Cart"
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-1.5 p-2 rounded-lg text-[#555] hover:text-[#151515] hover:bg-gray-100 transition-colors"
              >
                <ShoppingCart size={20} />
                <span className="hidden sm:block text-[11px] font-bold">Cart</span>
                {cartCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-black text-white shadow-sm"
                    style={{ backgroundColor: themeColor }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── 3. Hero Section (Custom Banner or Dynamic Gradient) ── */}
      <section
        className="relative text-white py-14 overflow-hidden bg-cover bg-center"
        style={
          store.bannerUrl
            ? { backgroundImage: `url(${store.bannerUrl})` }
            : {
                background: `linear-gradient(135deg, #151515 0%, ${themeColor}88 100%)`,
              }
        }
      >
        {/* Dark overlay if banner image is used */}
        {store.bannerUrl && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        )}

        <div className="relative max-w-[1280px] mx-auto px-4 text-center z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 border border-white/20 bg-white/10 backdrop-blur-md"
          >
            <Sparkles size={12} style={{ color: themeColor }} /> Official Dropshipper Store
          </div>
          <h1 className="text-[32px] sm:text-[44px] font-black leading-tight tracking-tight drop-shadow-sm">
            {store.storeName || store.businessName}
          </h1>
          {store.tagline && (
            <p className="mt-2 text-base sm:text-lg font-bold text-white/90 drop-shadow-sm max-w-xl mx-auto">
              {store.tagline}
            </p>
          )}
          {store.description && (
            <p className="mt-3 max-w-2xl mx-auto text-sm text-gray-200 leading-relaxed drop-shadow-sm">
              {store.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-11 rounded-lg px-7 text-[12px] font-black text-white transition-all shadow-lg hover:shadow-xl hover:scale-102 flex items-center gap-2"
              style={{ backgroundColor: themeColor }}
            >
              Shop All Products <ArrowRight size={15} />
            </button>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-lg px-6 text-[12px] font-black bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/30 transition-colors flex items-center gap-2"
              >
                <MessageCircle size={15} /> Chat with Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. Featured Products Carousel / Pinned (If Available) ── */}
      {featuredProducts.length > 0 && (
        <section className="bg-white border-b border-gray-100 py-8">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: themeColor }} />
                <h2 className="text-lg font-black text-[#151515]">Featured Picks</h2>
              </div>
              <span className="text-xs font-semibold text-[#777]">Hand-selected by the store</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  themeColor={themeColor}
                  isFeatured
                  onAddToCart={addToCart}
                  onOpenDetail={setDetailProduct}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. Search & Categories ── */}
      <div className="max-w-[1280px] mx-auto px-4 py-6 w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="flex h-11 items-center border border-gray-200 bg-white rounded-lg overflow-hidden flex-1 max-w-xl focus-within:border-gray-400 transition-colors">
            <Search size={16} className="ml-3.5 text-gray-400 flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products in this store..."
              className="flex-1 min-w-0 px-3 text-[13px] outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mr-3 text-gray-400 hover:text-[#151515]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-semibold text-[#444] outline-none shadow-2xs"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => {
              const count = products.filter((p) => p.product.categoryId === c.id).length;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} {count > 0 ? `(${count})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            style={activeCategory === 'all' ? { backgroundColor: themeColor, color: '#fff' } : undefined}
            className={`h-9 flex-shrink-0 rounded-lg px-4 text-[11px] font-black transition-all ${
              activeCategory === 'all'
                ? 'shadow-sm'
                : 'bg-white border border-gray-200 text-[#555] hover:bg-gray-50'
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map((cat) => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={isCatActive ? { backgroundColor: themeColor, color: '#fff' } : undefined}
                className={`h-9 flex-shrink-0 rounded-lg px-4 text-[11px] font-black transition-all ${
                  isCatActive
                    ? 'shadow-sm'
                    : 'bg-white border border-gray-200 text-[#555] hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 6. Product Grid ── */}
      <section id="products" className="max-w-[1280px] mx-auto px-4 pb-12 flex-1 w-full">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 bg-white rounded-xl p-16 text-center shadow-2xs">
            <Search size={40} className="text-gray-300 mb-3" />
            <p className="font-black text-[#151515] text-lg">No products found</p>
            <p className="mt-1 text-xs text-[#777] max-w-sm">
              We could not find any items matching your filters. Try clearing your search query or selecting a different category.
            </p>
            {(query || activeCategory !== 'all') && (
              <button
                type="button"
                onClick={() => { setQuery(''); setActiveCategory('all'); }}
                className="mt-4 text-xs font-black underline hover:opacity-80"
                style={{ color: themeColor }}
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                themeColor={themeColor}
                onAddToCart={addToCart}
                onOpenDetail={setDetailProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 7. Floating WhatsApp Contact Button ── */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-full shadow-2xl hover:bg-emerald-700 hover:scale-105 transition-all text-xs font-black"
        >
          <MessageCircle size={20} />
          <span className="hidden sm:inline">Chat with store</span>
        </a>
      )}

      {/* ── 8. Enhanced Storefront Footer ── */}
      <footer className="mt-auto bg-[#151515] text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/10 overflow-hidden border border-white/20">
                <img
                  src={storeLogo}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/150?text=' +
                      encodeURIComponent(store.storeName?.[0] || 'S');
                  }}
                />
              </div>
              <h3 className="text-[17px] font-black">
                {store.storeName || store.businessName}
              </h3>
            </div>
            {store.tagline && (
              <p className="text-xs font-bold text-gray-300 italic">{store.tagline}</p>
            )}
            <p className="text-[12px] text-gray-400 leading-relaxed">
              {store.description || 'Local dropshipping store powered by Local Drop Shipping GH.'}
            </p>
            {store.location && (
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <MapPin size={13} style={{ color: themeColor }} /> {store.location}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-[13px] font-black mb-3 text-gray-200">Quick Navigation</h4>
            <div className="space-y-2">
              <Link href="/" className="block text-[12px] text-gray-400 hover:text-white transition-colors">
                Marketplace Home
              </Link>
              <Link href="/dropshipper" className="block text-[12px] text-gray-400 hover:text-white transition-colors">
                Become a Dropshipper
              </Link>
              <button
                type="button"
                onClick={() => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="block text-[12px] text-gray-400 hover:text-white transition-colors text-left"
              >
                Browse Catalog
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-black mb-3 text-gray-200">Customer Support</h4>
            <div className="space-y-2.5 text-[12px] text-gray-400">
              {store.whatsapp && (
                <p className="flex items-center gap-2 text-emerald-400">
                  <MessageCircle size={14} /> WhatsApp: {store.whatsapp}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Truck size={14} style={{ color: themeColor }} /> Nationwide delivery via GhanaPost GPS
              </p>
              <p className="flex items-center gap-2">
                <CreditCard size={14} /> MTN MoMo, Telecel & Bank Card
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-black mb-3 text-gray-200">Connect With Us</h4>
            <p className="text-[11px] text-gray-400 mb-3">
              Follow this store for updates, discounts, and latest arrivals.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {store.socialLinks?.instagram && (
                <a
                  href={store.socialLinks.instagram.startsWith('http') ? store.socialLinks.instagram : `https://instagram.com/${store.socialLinks.instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram size={15} />
                </a>
              )}
              {store.socialLinks?.facebook && (
                <a
                  href={store.socialLinks.facebook.startsWith('http') ? store.socialLinks.facebook : `https://facebook.com/${store.socialLinks.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook size={15} />
                </a>
              )}
              {store.socialLinks?.twitter && (
                <a
                  href={store.socialLinks.twitter.startsWith('http') ? store.socialLinks.twitter : `https://x.com/${store.socialLinks.twitter.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                  aria-label="Twitter / X"
                >
                  <Twitter size={15} />
                </a>
              )}
              {store.socialLinks?.tiktok && (
                <a
                  href={store.socialLinks.tiktok.startsWith('http') ? store.socialLinks.tiktok : `https://tiktok.com/@${store.socialLinks.tiktok.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-2.5 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[11px] font-bold text-gray-300 hover:text-white transition-colors"
                  aria-label="TikTok"
                >
                  TikTok <ExternalLink size={11} />
                </a>
              )}
              {!store.socialLinks?.instagram && !store.socialLinks?.facebook && !store.socialLinks?.twitter && !store.socialLinks?.tiktok && (
                <span className="text-[11px] text-gray-500 italic">No social links configured yet.</span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-5 text-center text-[11px] text-gray-400">
          <span>
            © {new Date().getFullYear()} {store.storeName || store.businessName}. Powered by{' '}
            <Link href="/" className="font-bold text-white hover:underline">
              Local Drop Shipping GH
            </Link>.
          </span>
        </div>
      </footer>

      {/* ── 9. Product Detail Modal ── */}
      {detailProduct && (
        <ProductModal
          product={detailProduct}
          themeColor={themeColor}
          onClose={() => setDetailProduct(null)}
          onAddToCart={addToCart}
          onBuyNow={handleBuyNow}
        />
      )}

      {/* ── 10. Cart Drawer ── */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}
        >
          <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h2 className="text-lg font-black text-[#151515]">Shopping Cart</h2>
                <p className="text-xs text-[#777]">{cartCount} item{cartCount === 1 ? '' : 's'}</p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {cartLines.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <ShoppingCart className="mx-auto text-gray-300" size={42} />
                    <p className="mt-3 font-black text-[#151515]">Your cart is empty.</p>
                    <p className="mt-1 text-xs text-[#777]">Add products to start your order.</p>
                  </div>
                </div>
              ) : (
                cartLines.map((line) => (
                  <div
                    key={`${line.dropshipperProductId}`}
                    className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border border-gray-100 p-3 bg-[#fafafa]"
                  >
                    <img
                      src={line.item.product.images[0] || 'https://via.placeholder.com/76?text=No+Image'}
                      alt={line.item.product.name}
                      className="h-20 w-full bg-white object-contain p-2 rounded-lg border border-gray-100"
                    />
                    <div className="min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-xs font-black leading-snug text-[#151515]">
                          {line.item.product.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeFromCart(line.dropshipperProductId)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <p className="text-xs font-black" style={{ color: themeColor }}>
                        {formatMoney(line.item.sellingPrice)}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="inline-flex items-center overflow-hidden rounded-md border border-gray-200 bg-white">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(line.dropshipperProductId, line.quantity - 1)}
                            className="grid h-7 w-7 place-items-center hover:bg-gray-50 text-gray-600"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="grid h-7 w-8 place-items-center border-x border-gray-200 text-xs font-black">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(line.dropshipperProductId, line.quantity + 1)}
                            className="grid h-7 w-7 place-items-center hover:bg-gray-50 text-gray-600"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <p className="text-xs font-black text-[#151515]">
                          {formatMoney(line.item.sellingPrice * line.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 p-5 bg-white space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#777]">
                  <span>Subtotal</span>
                  <span>{formatMoney(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-[#777]">
                  <span>Delivery (GhanaPost GPS)</span>
                  <span>{formatMoney(deliveryFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-black text-[#151515]">
                  <span>Total</span>
                  <span style={{ color: themeColor }}>{formatMoney(cartTotal)}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={cartLines.length === 0}
                onClick={() => setCheckoutOpen(true)}
                style={{ backgroundColor: themeColor }}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-xs font-black text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300 transition-opacity"
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── 11. Checkout Modal ── */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCheckout}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#151515]">Express Checkout</h2>
                <p className="text-xs text-[#777]">Fast delivery via GhanaPost GPS nationwide.</p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-black text-[#666]">
                Full name
                <input
                  name="fullName"
                  required
                  placeholder="e.g. Kofi Mensah"
                  className="h-10 rounded-lg border border-gray-200 px-3 text-xs text-[#1c1c1c] outline-none focus:border-gray-400"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-black text-[#666]">
                Phone number
                <input
                  name="phone"
                  required
                  placeholder="024 XXX XXXX"
                  className="h-10 rounded-lg border border-gray-200 px-3 text-xs text-[#1c1c1c] outline-none focus:border-gray-400"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-black text-[#666]">
                Region
                <input
                  name="region"
                  required
                  placeholder="e.g. Greater Accra"
                  className="h-10 rounded-lg border border-gray-200 px-3 text-xs text-[#1c1c1c] outline-none focus:border-gray-400"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-black text-[#666]">
                City / Town
                <input
                  name="city"
                  required
                  placeholder="e.g. Madina"
                  className="h-10 rounded-lg border border-gray-200 px-3 text-xs text-[#1c1c1c] outline-none focus:border-gray-400"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-black text-[#666]">
                GhanaPost GPS Address
                <input
                  name="ghanaPostGps"
                  required
                  placeholder="GA-184-9022"
                  className="h-10 rounded-lg border border-gray-200 px-3 text-xs text-[#1c1c1c] outline-none focus:border-gray-400"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-black text-[#666]">
                MTN MoMo / Telecel Number
                <input
                  name="momoNumber"
                  required
                  placeholder="024 XXX XXXX"
                  className="h-10 rounded-lg border border-gray-200 px-3 text-xs text-[#1c1c1c] outline-none focus:border-gray-400"
                />
              </label>
            </div>

            <label className="mt-3 grid gap-1 text-[11px] font-black text-[#666]">
              Delivery instructions / Landmark
              <textarea
                name="notes"
                rows={2}
                placeholder="Near the shell station, blue gate..."
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-[#1c1c1c] outline-none focus:border-gray-400"
              />
            </label>

            <div className="mt-4 rounded-lg bg-gray-50 p-4 space-y-1.5 border border-gray-100">
              <div className="flex justify-between text-xs text-[#777]">
                <span>Items Subtotal</span>
                <span>{formatMoney(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#777]">
                <span>Standard Delivery</span>
                <span>{formatMoney(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-2 text-[#151515]">
                <span>Total Payable</span>
                <span style={{ color: themeColor }}>{formatMoney(cartTotal)}</span>
              </div>
              <p className="text-[10px] text-gray-500 pt-1">
                A MoMo payment prompt will be dispatched upon order confirmation.
              </p>
            </div>

            <button
              type="submit"
              style={{ backgroundColor: themeColor }}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-xs font-black text-white hover:opacity-90 transition-opacity"
            >
              Place Order & Pay with MoMo <CreditCard size={16} />
            </button>
          </form>
        </div>
      )}

      {/* ── 12. Order Success Notification ── */}
      {orderNumber && (
        <div className="fixed bottom-5 left-1/2 z-[70] w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-white p-4 shadow-2xl animate-fade-in">
          <div className="flex gap-3 items-center">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center flex-shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-xs text-[#1c1c1c]">Order Confirmed: {orderNumber}</p>
              <p className="text-[11px] text-[#777]">
                Supplier has received your order and will dispatch shortly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOrderNumber(null)}
              className="text-gray-400 hover:text-[#1c1c1c]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
