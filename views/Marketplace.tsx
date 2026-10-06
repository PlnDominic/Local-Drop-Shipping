'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Gift,
  Heart,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tag,
  Truck,
  X,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { DeliveryFields } from '../components/checkout/DeliveryFields';
import { SupplierName } from '../components/SupplierName';
import { isValidGhanaPostGps, normalizeGhanaPostGps, type DeliveryQuote } from '../lib/checkout';
import { useRouter, useSearchParams } from 'next/navigation';
import { SaveButton } from '../components/SaveButton';
import { buildIndex, runSearch } from '../lib/search';
import { buildHeaderCategories } from '../lib/categories';
import { useGlobalStore } from '../store/globalStore';
import type { DropshipperProduct, Product } from '../store/globalStore';
import { useToast } from '../components/Toast';
import { SiteHeader } from '../components/SiteHeader';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { stockLevel, totalStock } from '../lib/stock';

const heroImage =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=90';
const heroBanner2 =
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80';
const heroBanner3 =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

const PAGE_SIZE = 12;

type SortKey = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'rating';
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'relevance', label: 'Best match' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
];

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

const ratingOf = (p: Product): number => p.ratingAvg ?? 0;

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

const ProductCard: React.FC<{
  product: DropshipperProduct;
  onAddToCart: (id: string) => void;
  horizontal?: boolean;
}> = ({ product, onAddToCart, horizontal = false }) => {
  const reviewCount = product.product.ratingCount ?? 0;
  const avgRating = ratingOf(product.product);
  const href = `/product/${product.id}`;
  const image = product.product.images[0];
  const categoryName =
    useGlobalStore((s) => s.categories.find((c) => c.id === product.product.categoryId)?.name) ??
    getCategoryLabel(product.product.categoryId);
  const hasOptions = product.product.variants.length > 0;
  const stock = stockLevel(product.product);
  const discount = product.product.suggestedPrice > product.sellingPrice
    ? Math.round(((product.product.suggestedPrice - product.sellingPrice) / product.product.suggestedPrice) * 100)
    : 0;

  const picture = image ? (
    <OptimizedImage src={image} alt={product.product.name} width={80} className="h-full w-full object-contain p-1 mix-blend-multiply" />
  ) : (
    <Package size={22} className="text-gray-300" />
  );

  if (horizontal) {
    return (
      <article className="flex gap-3 p-3 border border-gray-100 rounded bg-white hover:shadow-sm transition-shadow">
        <Link href={href} className="w-16 h-16 flex-shrink-0 bg-[#f7f7f7] rounded flex items-center justify-center overflow-hidden">
          {picture}
        </Link>
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-xs font-bold text-[#151515] hover:text-[#f04438] leading-tight">
            <Link href={href}>{product.product.name}</Link>
          </h4>
          <StarDisplay rating={avgRating} size={10} />
          <p className="mt-1 text-sm font-black text-[#f04438]">{formatMoney(product.sellingPrice)}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="group min-w-0 bg-white border border-gray-100 rounded hover:shadow-md transition-shadow">
      <div className="relative overflow-hidden bg-[#f7f7f7] aspect-square rounded-t">
        {discount > 0 && (
          <span className="absolute left-2 top-2 z-10 bg-[#f04438] px-2 py-0.5 text-[10px] font-black text-white rounded">
            -{discount}%
          </span>
        )}
        {stock === 'out' && (
          <span className="absolute left-2 bottom-2 z-10 bg-[#151515] px-2 py-0.5 text-[10px] font-black text-white rounded">Sold out</span>
        )}
        {stock === 'low' && (
          <span className="absolute left-2 bottom-2 z-10 bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white rounded">Only {totalStock(product.product)} left</span>
        )}
        <SaveButton dropshipperProductId={product.id} className="absolute right-2 top-2 z-10" />
        <Link href={href} className="flex h-full w-full items-center justify-center" aria-label={product.product.name}>
          {image ? (
            <OptimizedImage
              src={image}
              alt={product.product.name}
              width={300}
              className="h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <Package size={36} className="text-gray-300" />
          )}
        </Link>
      </div>
      <div className="p-3">
        <span className="text-[9px] font-bold text-[#777] uppercase tracking-wider">{categoryName}</span>
        <h3 className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-tight text-[#151515] hover:text-[#f04438] transition-colors">
          <Link href={href}>{product.product.name}</Link>
        </h3>
        <p className="mt-1 text-[10px] text-[#999] truncate">
          <SupplierName supplierId={product.product.supplierId} name={product.product.supplierName} />
        </p>
        {reviewCount > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <StarDisplay rating={avgRating} size={10} />
            <span className="text-[10px] text-[#999]">({reviewCount})</span>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[15px] font-black text-[#f04438]">
            {hasOptions && <span className="mr-1 text-[10px] font-bold text-[#999]">From</span>}
            {formatMoney(product.sellingPrice + (hasOptions ? Math.min(0, ...product.product.variants.map((v) => v.priceAdjustment)) : 0))}
          </span>
          {discount > 0 && (
            <span className="text-[11px] text-[#bbb] line-through">{formatMoney(product.product.suggestedPrice)}</span>
          )}
        </div>
        {hasOptions ? (
          <Link
            href={href}
            className="mt-3 flex w-full h-9 items-center justify-center rounded bg-[#151515] text-[11px] font-black text-white transition-colors hover:bg-[#f04438]"
          >
            Select Options
          </Link>
        ) : (
          <button
            type="button"
            disabled={stock === 'out'}
            onClick={() => onAddToCart(product.id)}
            className="mt-3 w-full h-9 rounded bg-[#151515] text-[11px] font-black text-white transition-colors hover:bg-[#f04438] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
          >
            {stock === 'out' ? 'Sold out' : 'Add to Cart'}
          </button>
        )}
      </div>
    </article>
  );
};

export const Marketplace: React.FC = () => {
  const {
    catalog,
    categories: storeCategories,
    supplierProfiles,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    submitCheckout,
    appliedPromo,
    applyPromoCode,
    clearPromo,
    currentUserId,
  } = useGlobalStore();

  const { showToast } = useToast();
  const router = useRouter();

  const searchParams = useSearchParams();
  const categories = useMemo(() => buildHeaderCategories(storeCategories), [storeCategories]);

  // Search and filter choices live in the URL so a search can be shared, bookmarked and survive a refresh.
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sort, setSort] = useState<SortKey>(
    (SORTS.some((x) => x.id === searchParams.get('sort')) ? searchParams.get('sort') : 'relevance') as SortKey,
  );
  const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1));
  const [minPrice, setMinPrice] = useState(searchParams.get('min') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') ?? '');
  const [minRating, setMinRating] = useState(Math.min(5, Math.max(0, parseInt(searchParams.get('rating') ?? '0', 10) || 0)));
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('instock') === '1');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === '1');
  const [filtersOpen, setFiltersOpen] = useState(
    ['min', 'max', 'rating', 'instock', 'verified'].some((k) => searchParams.has(k)),
  );
  const [cartOpen, setCartOpen] = useState(searchParams.get('cart') === '1');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  // 'unavailable' means the delivery_zones database update isn't applied yet; checkout then works as before.
  const [deliveryStatus, setDeliveryStatus] = useState<string>('idle');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // ?category= accepts a category's name-slug or id; resolve it once the categories have loaded.
  const categoryFromUrl = useRef(false);
  useEffect(() => {
    if (categoryFromUrl.current) return;
    const wanted = searchParams.get('category');
    if (!wanted) { categoryFromUrl.current = true; return; }
    const hit = categories.find((c) => c.slug === wanted || c.id === wanted);
    if (hit) { setActiveCategory(hit.id); categoryFromUrl.current = true; }
  }, [categories, searchParams]);

  // Any change to the search or filters returns to page 1 (but not on first load, which may carry ?page=).
  const skipPageReset = useRef(true);
  useEffect(() => {
    if (skipPageReset.current) { skipPageReset.current = false; return; }
    setCurrentPage(1);
  }, [activeCategory, sort, query, minPrice, maxPrice, minRating, inStockOnly, verifiedOnly]);

  // Mirror the choices into the address bar.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const cat = categories.find((c) => c.id === activeCategory);
      if (cat && cat.id !== 'all') params.set('category', cat.slug);
      if (sort !== 'relevance') params.set('sort', sort);
      if (minPrice.trim()) params.set('min', minPrice.trim());
      if (maxPrice.trim()) params.set('max', maxPrice.trim());
      if (minRating > 0) params.set('rating', String(minRating));
      if (inStockOnly) params.set('instock', '1');
      if (verifiedOnly) params.set('verified', '1');
      if (currentPage > 1) params.set('page', String(currentPage));
      const qs = params.toString();
      router.replace(qs ? `/marketplace?${qs}` : '/marketplace', { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [query, activeCategory, sort, minPrice, maxPrice, minRating, inStockOnly, verifiedOnly, currentPage, categories, router]);

  const publishedProducts = useMemo(() => catalog.filter((item) => item.isPublished), [catalog]);
  const catalogProducts = publishedProducts;
  const verifiedSupplierIds = useMemo(
    () => new Set(supplierProfiles.filter((sp) => sp.isVerified).map((sp) => sp.id)),
    [supplierProfiles],
  );

  const searchIndex = useMemo(
    () =>
      buildIndex(catalogProducts, (item) => ({
        name: item.product.name,
        sku: item.product.sku,
        category: categories.find((c) => c.id === item.product.categoryId)?.label,
        supplier: item.product.supplierName,
        store: item.storeName,
        description: item.customDescription,
      })),
    [catalogProducts, categories],
  );
  const searched = useMemo(() => runSearch(searchIndex, query), [searchIndex, query]);

  const minPriceNum = minPrice.trim() === '' ? null : parseFloat(minPrice);
  const maxPriceNum = maxPrice.trim() === '' ? null : parseFloat(maxPrice);
  const activeFilterCount =
    (minPriceNum !== null && !isNaN(minPriceNum) ? 1 : 0) +
    (maxPriceNum !== null && !isNaN(maxPriceNum) ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (verifiedOnly ? 1 : 0);

  const filteredProducts = useMemo(() => {
    const result = searched.results.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.product.categoryId === activeCategory;
      const matchesMinPrice = minPriceNum === null || isNaN(minPriceNum) || item.sellingPrice >= minPriceNum;
      const matchesMaxPrice = maxPriceNum === null || isNaN(maxPriceNum) || item.sellingPrice <= maxPriceNum;
      const matchesRating = minRating === 0 || ratingOf(item.product) >= minRating;
      const stockAvailable = item.product.variants.length > 0
        ? item.product.variants.some((v) => v.stockQty > 0)
        : item.product.stockQty > 0;
      const matchesStock = !inStockOnly || stockAvailable;
      const matchesVerified = !verifiedOnly || verifiedSupplierIds.has(item.product.supplierId);
      return matchesCategory && matchesMinPrice && matchesMaxPrice && matchesRating && matchesStock && matchesVerified;
    });

    const when = (i: DropshipperProduct) => new Date(i.createdAt ?? i.product.createdAt).getTime() || 0;
    switch (sort) {
      case 'newest': return [...result].sort((a, b) => when(b) - when(a));
      case 'price_asc': return [...result].sort((a, b) => a.sellingPrice - b.sellingPrice);
      case 'price_desc': return [...result].sort((a, b) => b.sellingPrice - a.sellingPrice);
      case 'rating': return [...result].sort((a, b) => ratingOf(b.product) - ratingOf(a.product));
      default: return result; // best match when searching, otherwise newest first (database order)
    }
  }, [searched, activeCategory, sort, minPriceNum, maxPriceNum, minRating, inStockOnly, verifiedOnly, verifiedSupplierIds]);

  const clearAllFilters = () => {
    setActiveCategory('all');
    setQuery('');
    setSort('relevance');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setInStockOnly(false);
    setVerifiedOnly(false);
  };

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
      .sort((a, b) => ratingOf(b.product) - ratingOf(a.product))
      .slice(0, 6),
    [catalogProducts]
  );

  const cartLines = cart
    .map((line) => {
      const item = publishedProducts.find((p) => p.id === line.dropshipperProductId);
      return item ? { ...line, item } : null;
    })
    .filter(Boolean) as Array<{
      dropshipperProductId: string;
      variantId?: string;
      variantLabel?: string;
      quantity: number;
      item: DropshipperProduct;
    }>;

  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const cartSubtotal = cartLines.reduce((sum, l) => sum + l.item.sellingPrice * l.quantity, 0);
  // The delivery fee is charged once per store order, and a cart can span several stores.
  const shipmentCount = new Set(cartLines.map((l) => l.item.dropshipperId)).size;
  const deliveryFee = deliveryQuote && cartSubtotal > 0 ? deliveryQuote.fee * shipmentCount : 0;
  const promoDiscount = appliedPromo ? cartSubtotal * appliedPromo.discount : 0;
  const cartTotal = cartSubtotal + deliveryFee - promoDiscount;

  const handleAddToCart = (id: string, variant?: { id: string; label: string }) => {
    addToCart(id, variant);
    setCartOpen(true);
    showToast('Added to cart!', 'success');
  };

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

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUserId) {
      setCheckoutOpen(false);
      showToast('Please sign in to place your order.', 'error');
      router.push('/login');
      return;
    }

    setCheckoutError('');
    const form = new FormData(event.currentTarget);
    const gps = String(form.get('ghanaPostGps') || '');
    if (!isValidGhanaPostGps(gps)) {
      setCheckoutError('Enter a valid GhanaPost GPS address, like GA-184-9022.');
      return;
    }
    if (!deliveryQuote && deliveryStatus !== 'unavailable') {
      setCheckoutError('Choose a region we deliver to so we can work out your delivery fee.');
      return;
    }
    setCheckoutSubmitting(true);
    const result = await submitCheckout({
      fullName: String(form.get('fullName') || ''),
      phone: String(form.get('phone') || ''),
      region: String(form.get('region') || ''),
      city: String(form.get('city') || ''),
      ghanaPostGps: normalizeGhanaPostGps(gps),
      paymentProvider: 'mtn_momo',
      momoNumber: String(form.get('momoNumber') || ''),
      notes: String(form.get('notes') || '')
    });
    setCheckoutSubmitting(false);

    if (result.success && result.orderNumber) {
      setOrderNumber(result.orderNumber);
      setCheckoutOpen(false);
      setCartOpen(false);
      clearPromo();
      setPromoInput('');
      showToast('Order placed successfully!', 'success');
    } else {
      setCheckoutError(result.error || 'Could not place your order. Please try again.');
      showToast(result.error || 'Checkout failed', 'error');
    }
  };

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailSubmitted(true);
    setTimeout(() => setEmailSubmitted(false), 3000);
  };

  return (
    <main className="min-h-screen bg-[#f4f4f4] text-[#1c1c1c]">

      <SiteHeader
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        query={query}
        onQueryChange={setQuery}
        onCartClick={() => setCartOpen(true)}
      />

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
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[11px] font-black text-[#555]">
                <span className="hidden sm:inline">Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  aria-label="Sort products"
                  className="h-8 rounded border border-gray-200 bg-white px-2 text-[11px] font-bold text-[#151515] outline-none focus:border-[#f04438]"
                >
                  {SORTS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className={`flex h-8 flex-shrink-0 items-center gap-1.5 rounded border px-3 text-[11px] font-black transition-colors ${
                  filtersOpen || activeFilterCount > 0
                    ? 'border-[#f04438] bg-[#f04438]/10 text-[#f04438]'
                    : 'border-gray-200 text-[#555] hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal size={13} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-[#f04438] text-[9px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {filtersOpen && (
              <div className="grid grid-cols-1 gap-4 rounded border border-gray-100 bg-[#fafafa] p-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#888]">
                    Price range (GHS)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="h-9 w-full min-w-0 rounded border border-gray-200 px-2.5 text-[12px] outline-none focus:border-[#f04438]"
                    />
                    <span className="text-gray-300">–</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="h-9 w-full min-w-0 rounded border border-gray-200 px-2.5 text-[12px] outline-none focus:border-[#f04438]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#888]">
                    Minimum rating
                  </label>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMinRating(n)}
                        className={`h-9 rounded border px-2.5 text-[11px] font-bold transition-colors ${
                          minRating === n
                            ? 'border-[#f04438] bg-[#f04438]/10 text-[#f04438]'
                            : 'border-gray-200 text-[#555] hover:bg-white'
                        }`}
                      >
                        {n === 0 ? 'Any' : `${n}+ ★`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#888]">
                      Availability
                    </label>
                    <label className="flex h-9 items-center gap-2 text-[12px] font-semibold text-[#333]">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="h-4 w-4 accent-[#f04438]"
                      />
                      In stock only
                    </label>
                    <label className="flex h-9 items-center gap-2 text-[12px] font-semibold text-[#333]">
                      <input
                        type="checkbox"
                        checked={verifiedOnly}
                        onChange={(e) => setVerifiedOnly(e.target.checked)}
                        className="h-4 w-4 accent-[#f04438]"
                      />
                      Verified suppliers only
                    </label>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="self-start text-[11px] font-bold text-[#f04438] hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-5">
            {!isLoading && query.trim() && (
              <p className="mb-4 text-[12px] text-[#666]" aria-live="polite">
                {filteredProducts.length} result{filteredProducts.length === 1 ? '' : 's'} for <strong className="text-[#151515]">&ldquo;{query.trim()}&rdquo;</strong>
                {searched.usedSpellingTolerance && filteredProducts.length > 0 && ' (showing close spellings)'}
              </p>
            )}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : pagedProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {pagedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                <Search size={40} className="text-gray-300 mb-4" />
                <p className="font-black text-[#151515] text-lg">
                  {catalogProducts.length === 0 ? 'No products listed yet' : 'No products found'}
                </p>
                <p className="mt-2 text-sm text-[#777]">
                  {catalogProducts.length === 0
                    ? 'Stores are getting ready. Join the waitlist and we will tell you when shopping opens.'
                    : 'Try a different spelling, category, price range or search term.'}
                </p>
                {catalogProducts.length === 0 ? (
                  <Link href="/" className="mt-5 inline-flex h-10 items-center rounded bg-[#f04438] px-6 text-[11px] font-black text-white transition-colors hover:bg-[#c0392b]">
                    Join the waitlist
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-5 h-10 rounded bg-[#f04438] px-6 text-[11px] font-black text-white transition-colors hover:bg-[#c0392b]"
                  >
                    Clear filters
                  </button>
                )}
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
              onClick={() => { setSort('relevance'); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
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
            {[
              { label: 'Marketplace', href: '/marketplace' },
              { label: 'Start Dropshipping', href: '/dropshipper' },
              { label: 'Supplier Portal', href: '/supplier' },
              { label: 'Admin Panel', href: '/admin' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block text-[12px] text-gray-400 hover:text-white mb-2 transition-colors">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <h4 className="text-[13px] font-black mb-4 text-gray-200">Support</h4>
            {[
              { label: 'Support', href: '/support' },
              { label: 'Shipping Info', href: '/shipping' },
              { label: 'Returns & Refunds', href: '/returns' },
              { label: 'My Orders', href: '/orders' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block text-[12px] text-gray-400 hover:text-white mb-2 transition-colors">
                {label}
              </Link>
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
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
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
                  <div key={`${line.dropshipperProductId}-${line.variantId ?? ''}`} className="grid grid-cols-[76px_1fr] gap-3 rounded border border-gray-200 p-3">
                    <img src={line.item.product.images[0]} alt={line.item.product.name} className="h-20 w-full bg-gray-100 object-contain p-2 rounded" />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 text-sm font-black leading-tight">{line.item.product.name}</h3>
                        <button type="button" onClick={() => removeFromCart(line.dropshipperProductId, line.variantId)} className="text-gray-400 hover:text-red-600">
                          <X size={15} />
                        </button>
                      </div>
                      {line.variantLabel && (
                        <p className="text-[11px] font-semibold text-[#999]">{line.variantLabel}</p>
                      )}
                      <p className="mt-1 text-xs font-bold text-[#777]">{formatMoney(line.item.sellingPrice)}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center overflow-hidden rounded border border-gray-200">
                          <button type="button" onClick={() => updateCartQuantity(line.dropshipperProductId, line.quantity - 1, line.variantId)} className="grid h-8 w-8 place-items-center hover:bg-gray-50">
                            <Minus size={14} />
                          </button>
                          <span className="grid h-8 w-9 place-items-center border-x border-gray-200 text-xs font-black">{line.quantity}</span>
                          <button type="button" onClick={() => updateCartQuantity(line.dropshipperProductId, line.quantity + 1, line.variantId)} className="grid h-8 w-8 place-items-center hover:bg-gray-50">
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
                  <span>Delivery</span><span>{deliveryQuote ? formatMoney(deliveryFee) : 'Calculated at checkout'}</span>
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
                onClick={() => {
                  if (!currentUserId) {
                    showToast('Please sign in to check out.', 'error');
                    router.push('/login');
                    return;
                  }
                  setCheckoutOpen(true);
                }}
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
                <p className="text-xs text-[#777]">Your order goes straight to the store's dashboard.</p>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} className="grid h-9 w-9 place-items-center rounded border border-gray-200 hover:bg-gray-50">
                <X size={18} />
              </button>
            </div>

            {checkoutError && (
              <div className="mb-4 rounded bg-red-50 px-3 py-2.5 text-xs text-red-700 border border-red-100">
                {checkoutError}
              </div>
            )}

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
                { name: 'fullName', label: 'Full name', placeholder: 'e.g. Ama Mensah', autoComplete: 'name' },
                { name: 'phone', label: 'Phone', placeholder: '024 XXX XXXX', autoComplete: 'tel' },
              ].map((f) => (
                <label key={f.name} className="grid gap-1 text-xs font-black text-[#777]">
                  {f.label}
                  <input name={f.name} required placeholder={f.placeholder} autoComplete={f.autoComplete} className="h-11 rounded border border-gray-200 px-4 text-sm text-[#1c1c1c] outline-none focus:border-[#f04438]" />
                </label>
              ))}
              <DeliveryFields
                onQuoteChange={(quote, status) => { setDeliveryQuote(quote); setDeliveryStatus(status); }}
                labelClassName="text-xs font-black text-[#777]"
                inputClassName="h-11 rounded border border-gray-200 px-4 text-sm font-normal text-[#1c1c1c] outline-none focus:border-[#f04438] bg-white"
              />
              <label className="grid gap-1 text-xs font-black text-[#777]">
                MoMo number
                <input name="momoNumber" required placeholder="024 XXX XXXX" autoComplete="tel" className="h-11 rounded border border-gray-200 px-4 text-sm text-[#1c1c1c] outline-none focus:border-[#f04438]" />
              </label>
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
                <span>
                  Delivery{shipmentCount > 1 && deliveryQuote ? ` (${shipmentCount} stores × ${formatMoney(deliveryQuote.fee)})` : ''}
                </span>
                <span>{deliveryQuote ? formatMoney(deliveryFee) : 'Choose your region'}</span>
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

            <button
              type="submit"
              disabled={checkoutSubmitting}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-[#f04438] text-sm font-black text-white hover:bg-[#c0392b] transition-colors disabled:opacity-60"
            >
              {checkoutSubmitting ? 'Placing order…' : 'Place Order'} <CreditCard size={17} />
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
    </main>
  );
};
