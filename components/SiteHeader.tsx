'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ChevronDown,
  Gift,
  Heart,
  LayoutGrid,
  Package,
  Phone,
  Search,
  ShoppingCart,
  Star,
  Tag,
  User,
  Zap,
} from 'lucide-react';
import { useGlobalStore } from '../store/globalStore';
import { useAuth } from '../lib/auth/AuthProvider';

export interface HeaderCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

/** Shared category list used by the marketplace search dropdown & "All Categories" menu. */
export const DEFAULT_HEADER_CATEGORIES: HeaderCategory[] = [
  { id: 'all', label: 'All Categories', icon: LayoutGrid },
  { id: 'cat-1', label: 'Electronics', icon: Zap },
  { id: 'cat-2', label: 'Fashion', icon: Heart },
  { id: 'cat-3', label: 'Beauty', icon: Star },
  { id: 'cat-4', label: 'Home & Living', icon: Package },
  { id: 'cat-5', label: 'Health', icon: Gift },
  { id: 'cat-6', label: 'Food & Grocery', icon: Tag },
];

const NAV_LINKS = [
  { label: 'Marketplace', href: '/' },
  { label: 'New Arrivals', href: '/' },
  { label: 'Supplier Portal', href: '/supplier' },
  { label: 'Start Dropshipping', href: '/dropshipper' },
  { label: 'API Docs', href: '/docs' },
];

interface SiteHeaderProps {
  /** Categories shown in the search-bar select and the "All Categories" dropdown. */
  categories?: HeaderCategory[];
  /** Controlled active category (marketplace page owns this state). Uncontrolled elsewhere. */
  activeCategory?: string;
  onCategoryChange?: (id: string) => void;
  /** Controlled search query (marketplace page owns this state). Uncontrolled elsewhere. */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Called on search submit when the page wants to filter in place instead of navigating. */
  onSearchSubmit?: () => void;
  /** Called when the cart icon is clicked, to open an in-page cart drawer. Falls back to a link to "/". */
  onCartClick?: () => void;
}

/**
 * Site-wide header: announcement bar + logo/search/account row + category nav bar.
 * Used identically across the marketplace, dropshipper, supplier, admin, and docs pages.
 */
export const SiteHeader: React.FC<SiteHeaderProps> = ({
  categories = DEFAULT_HEADER_CATEGORIES,
  activeCategory: controlledCategory,
  onCategoryChange,
  query: controlledQuery,
  onQueryChange,
  onSearchSubmit,
  onCartClick,
}) => {
  const { cart } = useGlobalStore();
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [localQuery, setLocalQuery] = useState('');
  const [localCategory, setLocalCategory] = useState('all');
  const [accountOpen, setAccountOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const query = controlledQuery ?? localQuery;
  const activeCategory = controlledCategory ?? localCategory;

  const setQuery = (q: string) => {
    if (onQueryChange) onQueryChange(q);
    else setLocalQuery(q);
  };

  const goToMarketplace = (params: Record<string, string>) => {
    const usp = new URLSearchParams(params);
    router.push(usp.toString() ? `/?${usp.toString()}` : '/');
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit();
      return;
    }
    if (pathname !== '/') {
      goToMarketplace(query.trim() ? { q: query.trim() } : {});
    }
  };

  const handleCategorySelect = (id: string) => {
    setCategoryMenuOpen(false);
    if (onCategoryChange) {
      onCategoryChange(id);
      if (pathname === '/') {
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    setLocalCategory(id);
    if (pathname !== '/') {
      goToMarketplace(id !== 'all' ? { category: id } : {});
    } else {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const dashboardHref =
    profile?.role === 'supplier' ? '/supplier'
    : profile?.role === 'admin' ? '/admin'
    : profile?.role === 'dropshipper' ? '/dropshipper'
    : null;

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
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
          <Link
            href="/"
            className="flex-shrink-0 font-black text-[#151515] leading-tight text-[13px] sm:text-[17px]"
          >
            <span className="hidden sm:inline">Local Drop Shipping </span>
            <span className="sm:hidden">LDS </span>
            <span className="text-[#f04438]">GH</span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 max-w-xl mx-auto">
            <div className="flex h-10 border border-gray-200 rounded overflow-hidden">
              <select
                aria-label="Category"
                value={activeCategory}
                onChange={(e) => handleCategorySelect(e.target.value)}
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
                type="submit"
                aria-label="Search"
                className="flex-shrink-0 bg-[#f04438] px-3 sm:px-4 text-white hover:bg-[#c0392b] transition-colors"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

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

            {onCartClick ? (
              <button
                type="button"
                aria-label="Cart"
                onClick={onCartClick}
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
            ) : (
              <Link
                href="/"
                aria-label="Cart"
                className="relative flex flex-col items-center gap-0.5 p-2 text-[#555] hover:text-[#151515] transition-colors"
              >
                <ShoppingCart size={20} />
                <span className="hidden sm:block text-[9px] font-semibold">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-[#f04438] px-1 text-[9px] font-black text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
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

          {NAV_LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="hidden md:block whitespace-nowrap hover:text-[#f04438] transition-colors">
              {label}
            </Link>
          ))}

          <div className="ml-auto items-center gap-2 text-[#f04438] font-black hidden md:flex">
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
                  onClick={() => handleCategorySelect(cat.id)}
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

      {/* Click-away for account dropdown */}
      {accountOpen && (
        <div className="fixed inset-0 z-[29]" onClick={() => setAccountOpen(false)} />
      )}
    </>
  );
};
