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
  User,
  X
} from 'lucide-react';
import { useGlobalStore } from '../store/globalStore';
import type { DropshipperProduct } from '../store/globalStore';

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

const ProductCard: React.FC<{
  product: DropshipperProduct;
  compact?: boolean;
  onAddToCart: (id: string) => void;
  onBuyNow: (id: string) => void;
}> = ({ product, compact = false, onAddToCart, onBuyNow }) => (
  <article className="min-w-0">
    <div className={`relative overflow-hidden bg-[#f2f2f2] ${compact ? 'aspect-[1.55/1]' : 'aspect-[1/0.92]'}`}>
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
      <h3 className="line-clamp-1 text-[19px] font-black leading-tight tracking-normal text-[#151515]">
        {product.product.name}
      </h3>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-[#777]">
          <Star size={13} fill="#f5a524" strokeWidth={0} />
          4.8 (1.2k Reviews)
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
          Add to Chart
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

export const Marketplace: React.FC = () => {
  const {
    dropshipperProducts,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    submitCheckout
  } = useGlobalStore();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortMode, setSortMode] = useState<'default' | 'new' | 'bestseller' | 'discount'>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const recsRef = useRef<HTMLDivElement>(null);

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
    // 'new' keeps insertion order (already newest-first in the mock)

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
  const cartTotal = cartSubtotal + deliveryFee;

  const handleAddToCart = (id: string) => { addToCart(id); setCartOpen(true); };
  const handleBuyNow = (id: string) => { addToCart(id); setCartOpen(true); setCheckoutOpen(true); };

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
            aria-label="Stuffsus home"
          >
            <span className="flex h-7 w-7 items-center justify-center bg-[#151515] text-white text-xs font-black">∧</span>
            <span>Stuffsus</span>
          </a>

          <nav className="flex items-center gap-10 text-xs font-black max-sm:hidden">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Beranda</a>
            <a href="#shop" onClick={(e) => { e.preventDefault(); scrollTo('shop'); }}>Shop</a>
            <a href="#blog" onClick={(e) => { e.preventDefault(); scrollTo('blog'); }}>Blog</a>
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
                aria-label="Search on Stuffsus"
                placeholder="Search on Stuffsus"
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
              {pagedProducts.length > 0 ? (
                <div className="grid grid-cols-3 gap-x-7 gap-y-10 max-lg:grid-cols-2 max-sm:grid-cols-1">
                  {pagedProducts.map((product, index) => (
                    <ProductCard
                      key={`${product.id}-${index}`}
                      product={product}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-[#d8d8d8] p-10 text-center">
                  <p className="font-black">No products match your search.</p>
                  <p className="mt-2 text-sm text-[#777]">Try another category or search term.</p>
                </div>
              )}

              {/* ── Pagination ── */}
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
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
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
            <h3 className="mb-3 text-[13px] font-black">Stuffsus for Homes and Needs</h3>
            <p className="max-w-[350px] text-xs leading-7 text-[#e7e7e7]">
              We'll listen to your needs, identify the best approach, and then create a bespoke smart EV charging solution that's right for you.
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
          <form onSubmit={handleCheckout} className="w-full max-w-lg bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Checkout</h2>
                <p className="text-xs text-[#777]">Demo checkout creates an order in local state.</p>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} className="grid h-9 w-9 place-items-center border border-gray-200 hover:bg-gray-50">
                <X size={18} />
              </button>
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

            <div className="mt-5 bg-gray-50 p-4">
              <div className="flex justify-between text-sm font-bold">
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
        <div className="fixed bottom-5 left-1/2 z-[70] w-[calc(100%-32px)] max-w-md -translate-x-1/2 border border-emerald-200 bg-white p-4 shadow-2xl">
          <div className="flex gap-3">
            <CheckCircle2 className="shrink-0 text-emerald-600" size={24} />
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
