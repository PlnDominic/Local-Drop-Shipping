'use client';

import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import type { Product } from '../store/globalStore';
import { useToast } from '../components/Toast';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  LayoutGrid,
  PlusCircle,
  ShoppingBag,
  FileText,
  Wallet,
  ArrowRight,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  Package,
  TrendingUp,
  Share2,
  Palette,
  Sparkles,
  Image as ImageIcon,
  Globe,
  MessageCircle,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { updateDropshipperStoreCustomization } from '../lib/supabase/queries';

const formatMoney = (amount: number) =>
  `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

type Tab = 'overview' | 'import' | 'my-store' | 'customize' | 'orders' | 'wallet';

export const DropshipperDashboard: React.FC = () => {
  const {
    products,
    dropshipperProducts,
    importProductToStore,
    togglePublishProduct,
    updateImportedPrice,
    removeImportedProduct,
    orders,
    wallets,
    withdrawFunds,
    transactions,
    currentUserId,
    dropshipperProfile,
  } = useGlobalStore();

  const { showToast } = useToast();
  const { profile } = useAuth();
  const uid = currentUserId ?? '';

  const firstName = profile?.fullName?.split(' ')[0] ?? '';
  const storeName = dropshipperProfile?.storeName ?? (firstName ? `${firstName}'s Store` : 'My Store');
  const storeSlug = dropshipperProfile?.storeSlug ?? '';
  const storefrontUrl = storeSlug ? `/store/${storeSlug}` : '';

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Store customization state
  const [themeColor, setThemeColor] = useState(dropshipperProfile?.themeColor || '#f04438');
  const [bannerUrl, setBannerUrl] = useState(dropshipperProfile?.bannerUrl || '');
  const [tagline, setTagline] = useState(dropshipperProfile?.tagline || '');
  const [announcement, setAnnouncement] = useState(dropshipperProfile?.announcement || '');
  const [whatsapp, setWhatsapp] = useState(dropshipperProfile?.whatsapp || '');
  const [instagram, setInstagram] = useState(dropshipperProfile?.socialLinks?.instagram || '');
  const [facebook, setFacebook] = useState(dropshipperProfile?.socialLinks?.facebook || '');
  const [tiktok, setTiktok] = useState(dropshipperProfile?.socialLinks?.tiktok || '');
  const [twitter, setTwitter] = useState(dropshipperProfile?.socialLinks?.twitter || '');
  const [selectedFeatured, setSelectedFeatured] = useState<string[]>(dropshipperProfile?.featuredProductIds || []);
  const [savingCustomization, setSavingCustomization] = useState(false);

  // Sync state if dropshipperProfile loads late
  React.useEffect(() => {
    if (dropshipperProfile) {
      if (dropshipperProfile.themeColor) setThemeColor(dropshipperProfile.themeColor);
      if (dropshipperProfile.bannerUrl) setBannerUrl(dropshipperProfile.bannerUrl);
      if (dropshipperProfile.tagline) setTagline(dropshipperProfile.tagline);
      if (dropshipperProfile.announcement) setAnnouncement(dropshipperProfile.announcement);
      if (dropshipperProfile.whatsapp) setWhatsapp(dropshipperProfile.whatsapp);
      if (dropshipperProfile.socialLinks?.instagram) setInstagram(dropshipperProfile.socialLinks.instagram);
      if (dropshipperProfile.socialLinks?.facebook) setFacebook(dropshipperProfile.socialLinks.facebook);
      if (dropshipperProfile.socialLinks?.tiktok) setTiktok(dropshipperProfile.socialLinks.tiktok);
      if (dropshipperProfile.socialLinks?.twitter) setTwitter(dropshipperProfile.socialLinks.twitter);
      if (dropshipperProfile.featuredProductIds) setSelectedFeatured(dropshipperProfile.featuredProductIds);
    }
  }, [dropshipperProfile]);

  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setSavingCustomization(true);
    try {
      await updateDropshipperStoreCustomization(uid, {
        themeColor,
        bannerUrl: bannerUrl || null,
        tagline: tagline || null,
        announcement: announcement || null,
        whatsapp: whatsapp || null,
        socialLinks: {
          ...(instagram ? { instagram } : {}),
          ...(facebook ? { facebook } : {}),
          ...(tiktok ? { tiktok } : {}),
          ...(twitter ? { twitter } : {}),
        },
        featuredProductIds: selectedFeatured,
      });
      showToast('Storefront customization saved!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save customization', 'error');
    } finally {
      setSavingCustomization(false);
    }
  };

  const toggleFeaturedProduct = (id: string) => {
    setSelectedFeatured((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        showToast('You can pin up to 4 featured products.', 'error');
        return prev;
      }
      return [...prev, id];
    });
  };

  // Importer state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [markupPrice, setMarkupPrice] = useState<number>(0);
  const [customDesc, setCustomDesc] = useState('');

  // Catalog filter
  const [query, setQuery] = useState('');

  // Wallet state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [momoProvider, setMomoProvider] = useState('MTN MoMo');
  const [momoPhone, setMomoPhone] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  // Derived data
  const importedProductIds = dropshipperProducts.map((dp) => dp.productId);
  const availableToImport = products
    .filter((p) => !importedProductIds.includes(p.id))
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  const dpOrders = orders.filter((o) => o.dropshipperId === uid);
  const wallet = wallets[uid] || { balance: 0, totalEarned: 0 };

  const totalSales = dpOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalOrders = dpOrders.length;
  const totalCommissions = dpOrders.reduce((acc, o) => acc + o.profitAmount, 0);
  const pendingCommissions = orders
    .filter((o) => o.dropshipperId === uid && o.status !== 'shipped')
    .reduce((acc, o) => acc + o.profitAmount, 0);

  const handleOpenImportModal = (p: Product) => {
    setSelectedProduct(p);
    setMarkupPrice(p.suggestedPrice);
    setCustomDesc(p.description);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    importProductToStore(selectedProduct.id, markupPrice, customDesc);
    setSelectedProduct(null);
    setActiveTab('my-store');
    showToast('Product imported to your store!', 'success');
  };

  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess(false);

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Enter a valid amount.');
      return;
    }
    if (amt > wallet.balance) {
      setWithdrawError('Insufficient balance.');
      return;
    }

    const success = withdrawFunds(uid, amt, `${momoProvider} (${momoPhone})`);
    if (success) {
      setWithdrawSuccess(true);
      setWithdrawAmount('');
      showToast('Withdrawal successful!', 'success');
    } else {
      setWithdrawError('Withdrawal transaction failed.');
      showToast('Withdrawal failed', 'error');
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'import', label: 'Import Products', icon: PlusCircle },
    { id: 'my-store', label: 'My Store', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: FileText },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
  ];

  return (
    <div className="bg-[#F9FAFB] min-h-screen font-sans animate-fade-in">
      {/* ── Hero strip ── */}
      <div className="bg-[#151515] text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest mb-1">Dropshipper Hub</p>
            <h1 className="text-[26px] font-black leading-tight">{storeName}</h1>
            <p className="text-gray-400 text-[12px] mt-1">Import products, set your markup, and earn on every sale.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Balance</p>
              <p className="text-lg font-black text-white">{formatMoney(wallet.balance)}</p>
            </div>
            <div className="rounded bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Orders</p>
              <p className="text-lg font-black text-white">{totalOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab pills ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 flex gap-1 overflow-x-auto py-3 scrollbar-none">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 h-9 rounded px-4 text-[12px] font-black whitespace-nowrap transition-colors ${
                  active ? 'bg-[#f04438] text-white' : 'bg-gray-100 text-[#555] hover:bg-gray-200'
                }`}
              >
                <Icon size={14} />
                {t.label}
                {t.id === 'import' && availableToImport.length > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${active ? 'bg-white/25' : 'bg-[#f04438] text-white'}`}>
                    {availableToImport.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-5 space-y-4">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Gross Sales', value: formatMoney(totalSales), sub: `From ${totalOrders} orders`, color: 'text-[#151515]' },
                { label: 'Withdrawable', value: formatMoney(wallet.balance), sub: `Earned ${formatMoney(wallet.totalEarned)}`, color: 'text-[#f04438]' },
                { label: 'Commissions', value: formatMoney(totalCommissions), sub: 'Net margins credited', color: 'text-[#151515]' },
                { label: 'Escrow Held', value: formatMoney(pendingCommissions), sub: 'Pending shipment', color: 'text-yellow-600' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded border border-gray-100 p-4 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</span>
                  <h3 className={`text-xl font-black ${kpi.color}`}>{kpi.value}</h3>
                  <span className="text-[10px] text-[#999]">{kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* Promote panel */}
            <div className="bg-white rounded border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-4">
                <h2 className="text-[15px] font-black text-[#151515]">Grow your store</h2>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="space-y-3">
                  <p className="text-[12px] text-[#555] leading-relaxed">
                    Import wholesale products from verified local suppliers, set your own price, and share your
                    storefront on WhatsApp, TikTok & Instagram. When a customer orders, the supplier ships
                    directly &mdash; you keep the margin.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('import')}
                      className="h-9 rounded bg-[#151515] px-5 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center gap-1.5"
                    >
                      Import Products <ArrowRight size={14} />
                    </button>
                    {storefrontUrl ? (
                      <a
                        href={storefrontUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 rounded border border-[#f04438] px-5 text-[11px] font-black text-[#f04438] hover:bg-[#f04438]/10 transition-colors flex items-center gap-1.5"
                      >
                        <Share2 size={13} /> View Storefront
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setActiveTab('import'); }}
                        className="h-9 rounded border border-gray-200 px-5 text-[11px] font-black text-[#151515] hover:border-[#f04438] hover:text-[#f04438] transition-colors flex items-center gap-1.5"
                      >
                        <PlusCircle size={13} /> Publish Products
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-[#f7f7f7] rounded p-5 space-y-2 text-[12px]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">Your storefront</p>
                  <p className="font-black text-[#151515]">{storeName}</p>
                  {storeSlug && (
                    <p className="text-[#777] font-mono text-[11px] break-all">
                      {window.location.origin + storefrontUrl}
                    </p>
                  )}
                  <p className="text-[#777]">
                    Published items: <strong className="text-[#151515]">{dropshipperProducts.filter((d) => d.isPublished).length}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── IMPORT ── */}
        {activeTab === 'import' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-black text-[#151515]">Supplier Catalog</h2>
                <p className="text-[11px] text-[#888]">Wholesale products from verified local suppliers.</p>
              </div>
              <div className="flex h-9 items-center border border-gray-200 rounded overflow-hidden flex-1 max-w-[220px]">
                <Search size={13} className="ml-3 text-gray-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 min-w-0 px-2 text-[11px] outline-none"
                />
              </div>
            </div>

            <div className="p-5">
              {availableToImport.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <CheckCircle2 size={40} className="text-[#f04438] mb-4" />
                  <p className="font-black text-[#151515] text-lg">All caught up</p>
                  <p className="mt-2 text-sm text-[#777] max-w-xs">You&apos;ve imported everything available. Check back when suppliers list new products.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('my-store')}
                    className="mt-5 h-10 rounded bg-[#151515] px-6 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors"
                  >
                    View My Store
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {availableToImport.map((p) => (
                    <article key={p.id} className="group min-w-0 bg-white border border-gray-100 rounded hover:shadow-md transition-shadow flex flex-col">
                      <div className="relative overflow-hidden bg-[#f7f7f7] aspect-square rounded-t">
                        <span className="absolute left-2 top-2 z-10 bg-[#151515] px-2 py-0.5 text-[10px] font-black text-white rounded">
                          Cost {formatMoney(p.costPrice)}
                        </span>
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <span className="text-[9px] font-bold text-[#777] uppercase tracking-wider">{p.supplierName || 'Supplier'}</span>
                        <h3 className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-tight text-[#151515]">{p.name}</h3>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[15px] font-black text-[#f04438]">{formatMoney(p.suggestedPrice)}</span>
                          <span className="text-[10px] text-[#999]">suggested</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenImportModal(p)}
                          className="mt-3 w-full h-9 rounded bg-[#151515] text-[11px] font-black text-white transition-colors hover:bg-[#f04438] flex items-center justify-center gap-1.5"
                        >
                          <PlusCircle size={14} /> Import
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── MY STORE ── */}
        {activeTab === 'my-store' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="text-[15px] font-black text-[#151515]">My Storefront Inventory</h2>
              <p className="text-[11px] text-[#888]">Set your price, toggle visibility, or remove items.</p>
            </div>

            {dropshipperProducts.length === 0 ? (
              <div className="p-5">
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <ShoppingBag size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">Your store is empty</p>
                  <p className="mt-2 text-sm text-[#777] max-w-xs">Import products from the supplier catalog to start selling.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('import')}
                    className="mt-5 h-10 rounded bg-[#151515] px-6 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors"
                  >
                    Browse & Import
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {dropshipperProducts.map((dp) => {
                  const margin = dp.sellingPrice - dp.product.costPrice;
                  return (
                    <div key={dp.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-[#fafafa] transition-colors">
                      <div className="h-14 w-14 flex-shrink-0 rounded bg-[#f7f7f7] grid place-items-center">
                        <img src={dp.product.images[0]} alt="" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 text-[13px] font-bold text-[#151515]">{dp.product.name}</h3>
                        <span className="text-[10px] text-[#999]">
                          SKU {dp.product.sku || '—'} · Cost {formatMoney(dp.product.costPrice)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-[#777]">GHS</span>
                        <input
                          type="number"
                          value={dp.sellingPrice}
                          onChange={(e) => updateImportedPrice(dp.id, parseFloat(e.target.value) || 0)}
                          className="w-20 h-9 rounded border border-gray-200 px-2 text-[12px] font-black text-[#f04438] focus:outline-none focus:border-[#f04438]"
                        />
                      </div>

                      <div className="text-right min-w-[80px]">
                        <p className="text-[9px] uppercase tracking-wider text-[#999] font-bold">Margin</p>
                        <p className={`text-[13px] font-black ${margin >= 0 ? 'text-[#f04438]' : 'text-gray-400'}`}>{formatMoney(margin)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => togglePublishProduct(dp.id)}
                        className={`h-8 rounded px-3 text-[10px] font-black uppercase tracking-wider transition-colors ${
                          dp.isPublished ? 'bg-[#f04438] text-white' : 'bg-gray-100 text-[#777] hover:bg-gray-200'
                        }`}
                      >
                        {dp.isPublished ? 'Published' : 'Hidden'}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImportedProduct(dp.id)}
                        title="Remove item"
                        className="grid h-8 w-8 place-items-center rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── CUSTOMIZE STORE ── */}
        {activeTab === 'customize' && (
          <form onSubmit={handleSaveCustomization} className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-lg border border-gray-100">
              <div>
                <h2 className="text-lg font-black text-[#151515]">Storefront Customizer</h2>
                <p className="text-xs text-[#777]">
                  Design your custom storefront, set brand colors, banner, announcement bar, and social contact details.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {storefrontUrl && (
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-black text-[#151515] hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} /> View Live Store
                  </a>
                )}
                <button
                  type="submit"
                  disabled={savingCustomization}
                  className="h-10 px-6 rounded-lg bg-[#151515] hover:bg-[#f04438] text-xs font-black text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  {savingCustomization ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: Branding & Color */}
              <div className="space-y-5">
                {/* Brand Color */}
                <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-[#151515] uppercase tracking-wider">
                    <Palette size={16} style={{ color: themeColor }} /> Brand Color Scheme
                  </div>
                  <p className="text-xs text-[#777]">
                    Selected color will be applied to your storefront's buttons, badges, discount banners, and hero accents.
                  </p>

                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="h-12 w-12 rounded cursor-pointer border border-gray-200 p-1"
                    />
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">HEX Code</label>
                      <input
                        type="text"
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        placeholder="#f04438"
                        className="w-full h-9 rounded border border-gray-200 px-3 text-xs font-black text-[#151515] uppercase focus:border-gray-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Preset Colors */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Preset Accents</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: 'Sunset Red', color: '#f04438' },
                        { label: 'Emerald Green', color: '#10b981' },
                        { label: 'Sapphire Blue', color: '#3b82f6' },
                        { label: 'Royal Purple', color: '#8b5cf6' },
                        { label: 'Amber Gold', color: '#f59e0b' },
                        { label: 'Rose Pink', color: '#ec4899' },
                        { label: 'Midnight Black', color: '#18181b' },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setThemeColor(preset.color)}
                          className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                          style={{
                            backgroundColor: preset.color,
                            borderColor: themeColor === preset.color ? '#151515' : 'transparent',
                          }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Announcement Bar */}
                <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-[#151515] uppercase tracking-wider">
                    <Sliders size={16} /> Top Promo Strip
                  </div>
                  <p className="text-xs text-[#777]">
                    Display an urgent promotional bar at the very top of your storefront.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      Announcement message
                    </label>
                    <input
                      type="text"
                      value={announcement}
                      onChange={(e) => setAnnouncement(e.target.value)}
                      placeholder="e.g. Free delivery across Accra on orders over GHS 250! 🚚"
                      className="w-full h-10 rounded border border-gray-200 px-3 text-xs text-[#151515] focus:border-gray-400 outline-none"
                    />
                  </div>
                </div>

                {/* Tagline & Identity */}
                <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-[#151515] uppercase tracking-wider">
                    <Sparkles size={16} /> Identity & Tagline
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      Store Catchphrase / Tagline
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Quality electronics & lifestyle essentials in Ghana"
                      className="w-full h-10 rounded border border-gray-200 px-3 text-xs text-[#151515] focus:border-gray-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Middle Column: Visual Assets & Social */}
              <div className="space-y-5">
                {/* Hero Banner */}
                <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-[#151515] uppercase tracking-wider">
                    <ImageIcon size={16} /> Hero Banner Image
                  </div>
                  <p className="text-xs text-[#777]">
                    Provide a direct image URL to set as your hero section background. If left empty, a rich dynamic gradient based on your brand color will be used.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full h-10 rounded border border-gray-200 px-3 text-xs text-[#151515] focus:border-gray-400 outline-none"
                    />
                  </div>
                  {bannerUrl && (
                    <div className="h-28 rounded-lg overflow-hidden border border-gray-200 relative">
                      <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[11px] font-black">
                        Preview
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp & Contacts */}
                <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-[#151515] uppercase tracking-wider">
                    <MessageCircle size={16} className="text-emerald-500" /> WhatsApp Direct Chat
                  </div>
                  <p className="text-xs text-[#777]">
                    Enables a floating WhatsApp contact button on your storefront so buyers can chat with you instantly.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      WhatsApp Phone Number
                    </label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+233 24 123 4567"
                      className="w-full h-10 rounded border border-gray-200 px-3 text-xs text-[#151515] focus:border-gray-400 outline-none"
                    />
                  </div>
                </div>

                {/* Social Links */}
                <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-[#151515] uppercase tracking-wider">
                    <Globe size={16} /> Social Media Links
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Instagram handle / URL</label>
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@yourbrand or https://instagram.com/..."
                        className="w-full h-9 rounded border border-gray-200 px-3 text-xs text-[#151515] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">TikTok handle / URL</label>
                      <input
                        type="text"
                        value={tiktok}
                        onChange={(e) => setTiktok(e.target.value)}
                        placeholder="@yourbrand"
                        className="w-full h-9 rounded border border-gray-200 px-3 text-xs text-[#151515] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Facebook page</label>
                      <input
                        type="text"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        placeholder="yourbrand"
                        className="w-full h-9 rounded border border-gray-200 px-3 text-xs text-[#151515] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Twitter / X handle</label>
                      <input
                        type="text"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="@yourbrand"
                        className="w-full h-9 rounded border border-gray-200 px-3 text-xs text-[#151515] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Featured Products Selector */}
              <div className="space-y-5">
                <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-black text-[#151515] uppercase tracking-wider">
                      <Sparkles size={16} style={{ color: themeColor }} /> Featured Picks ({selectedFeatured.length}/4)
                    </div>
                  </div>
                  <p className="text-xs text-[#777]">
                    Select up to 4 imported products to pin directly in the "Featured Picks" section of your storefront.
                  </p>

                  {dropshipperProducts.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-gray-200 rounded-lg">
                      <p className="text-xs text-[#777]">You have no imported products yet. Import products to feature them here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                      {dropshipperProducts.map((dp) => {
                        const isPinned = selectedFeatured.includes(dp.id) || selectedFeatured.includes(dp.productId);
                        return (
                          <div
                            key={dp.id}
                            onClick={() => toggleFeaturedProduct(dp.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isPinned
                                ? 'border-[#151515] bg-[#151515]/5 shadow-xs'
                                : 'border-gray-100 bg-[#fafafa] hover:border-gray-300'
                            }`}
                          >
                            <img
                              src={dp.product.images[0]}
                              alt=""
                              className="h-10 w-10 object-contain rounded bg-white p-1 border border-gray-200 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-[#151515] line-clamp-1">{dp.product.name}</h4>
                              <p className="text-[11px] font-black text-[#777]">{formatMoney(dp.sellingPrice)}</p>
                            </div>
                            <div
                              className={`h-5 w-5 rounded-full border grid place-items-center text-[10px] font-black ${
                                isPinned ? 'bg-[#151515] text-white border-[#151515]' : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isPinned && '✓'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingCustomization}
                className="h-11 px-8 rounded-lg bg-[#151515] hover:bg-[#f04438] text-xs font-black text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles size={15} />
                {savingCustomization ? 'Saving Changes...' : 'Save Storefront Customization'}
              </button>
            </div>
          </form>
        )}

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="text-[15px] font-black text-[#151515]">Store Orders</h2>
              <p className="text-[11px] text-[#888]">Track sales and commissions from your storefront.</p>
            </div>

            {dpOrders.length === 0 ? (
              <div className="p-5">
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <FileText size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No orders yet</p>
                  <p className="mt-2 text-sm text-[#777] max-w-xs">Share your storefront link to start receiving orders.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f7f7f7] border-b border-gray-100 text-[10px] text-[#999] font-black uppercase tracking-wider">
                      <th className="p-4">Order</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Commission</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[12px] text-[#151515]">
                    {dpOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#fafafa]">
                        <td className="p-4 font-black text-[#f04438]">{o.orderNumber}</td>
                        <td className="p-4">
                          <span className="block font-bold">{o.customerName}</span>
                          <span className="text-[10px] text-[#999]">{o.customerPhone}</span>
                        </td>
                        <td className="p-4 max-w-xs truncate text-[#777]">
                          {o.items.map((item) => `${item.productName} (x${item.quantity})`).join(', ')}
                        </td>
                        <td className="p-4 font-semibold">{formatMoney(o.totalAmount)}</td>
                        <td className="p-4 font-black text-[#f04438]">{formatMoney(o.profitAmount)}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded ${
                            o.status === 'delivered' ? 'bg-[#f04438]/10 text-[#c0392b]' :
                            o.status === 'shipped' ? 'bg-blue-50 text-blue-700' :
                            o.status === 'processing' ? 'bg-purple-50 text-purple-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-4 text-[#999] text-[10px]">
                          {new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── WALLET ── */}
        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Withdraw */}
              <section className="bg-white rounded border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-4">
                  <h2 className="text-[15px] font-black text-[#151515]">Withdraw via Mobile Money</h2>
                  <p className="text-[11px] text-[#888]">Pull commissions to MTN MoMo, Telecel Cash, or your bank.</p>
                </div>
                <form onSubmit={handleWithdrawal} className="p-5 space-y-4">
                  {withdrawError && (
                    <div className="flex items-center gap-1.5 rounded bg-red-50 px-3 py-2.5 text-[11px] text-red-700 border border-red-100">
                      <AlertCircle size={14} /> <span>{withdrawError}</span>
                    </div>
                  )}
                  {withdrawSuccess && (
                    <div className="flex items-center gap-1.5 rounded bg-[#f04438]/10 px-3 py-2.5 text-[11px] text-[#c0392b] border border-[#f04438]/20">
                      <CheckCircle2 size={14} /> <span>Withdrawal processed!</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider">Provider</label>
                      <select
                        value={momoProvider}
                        onChange={(e) => setMomoProvider(e.target.value)}
                        className="w-full h-10 rounded border border-gray-200 px-3 text-[12px] font-semibold focus:outline-none focus:border-[#f04438] bg-white"
                      >
                        <option>MTN MoMo</option>
                        <option>Telecel Cash</option>
                        <option>AirtelTigo Money</option>
                        <option>GCB Bank Account</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider">Phone / Account</label>
                      <input
                        type="text"
                        required
                        placeholder="+233 ..."
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        className="w-full h-10 rounded border border-gray-200 px-3 text-[12px] font-semibold focus:outline-none focus:border-[#f04438]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider">Amount (GHS)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-black text-[#777]">₵</span>
                      <input
                        type="number"
                        min="1"
                        max={wallet.balance}
                        required
                        placeholder="e.g. 200"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full h-10 rounded border border-gray-200 pl-7 pr-4 text-[12px] font-black text-[#f04438] focus:outline-none focus:border-[#f04438]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded bg-[#151515] text-[12px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Wallet size={15} /> Withdraw Funds
                  </button>
                </form>
              </section>

              {/* History */}
              <section className="bg-white rounded border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-4">
                  <h2 className="text-[15px] font-black text-[#151515]">Payout History</h2>
                </div>
                <div className="p-4">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-12 text-center">
                      <Package size={32} className="text-gray-300 mb-3" />
                      <p className="text-[12px] text-[#777]">No transactions yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => {
                        const negative = tx.type === 'withdrawal' || tx.type === 'debit';
                        return (
                          <div key={tx.id} className="flex justify-between items-center rounded bg-[#f7f7f7] px-4 py-3">
                            <div className="min-w-0">
                              <strong className="block text-[12px] font-bold text-[#151515] truncate">{tx.description}</strong>
                              <span className="text-[10px] text-[#999]">{tx.reference} · {new Date(tx.createdAt).toLocaleString()}</span>
                            </div>
                            <strong className={`text-[13px] font-black ${negative ? 'text-gray-500' : 'text-[#f04438]'}`}>
                              {negative ? '-' : '+'}{formatMoney(Math.abs(tx.amount))}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-4">
              <div className="bg-[#151515] text-white rounded p-5 space-y-4">
                <div className="flex items-center gap-1.5 text-[#f04438]">
                  <TrendingUp size={16} />
                  <h3 className="text-[12px] font-black uppercase tracking-wider">Wallet</h3>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Available</p>
                  <p className="text-2xl font-black">{formatMoney(wallet.balance)}</p>
                </div>
                <div className="space-y-2 border-t border-white/10 pt-3 text-[12px]">
                  <div className="flex justify-between text-gray-400">
                    <span>Total earned</span>
                    <strong className="text-white">{formatMoney(wallet.totalEarned)}</strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Withdrawn</span>
                    <strong className="text-white">{formatMoney(Math.max(0, wallet.totalEarned - wallet.balance))}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Import setup modal ── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null); }}
        >
          <form
            onSubmit={handleImportSubmit}
            className="relative w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h4 className="text-[15px] font-black text-[#151515]">Set your markup</h4>
              <button type="button" onClick={() => setSelectedProduct(null)} className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 hover:bg-gray-50">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-3 rounded bg-[#f7f7f7] p-3">
                <div className="h-14 w-14 flex-shrink-0 rounded bg-white grid place-items-center">
                  <img src={selectedProduct.images[0]} alt="" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
                </div>
                <div className="min-w-0 text-[11px]">
                  <h5 className="font-bold text-[#151515] line-clamp-1">{selectedProduct.name}</h5>
                  <p className="text-[#777] mt-1">Wholesale: <span className="font-black text-[#151515]">{formatMoney(selectedProduct.costPrice)}</span></p>
                  <p className="text-[#777]">Suggested: <span className="font-black text-[#151515]">{formatMoney(selectedProduct.suggestedPrice)}</span></p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider">Your store price (GHS)</label>
                <input
                  type="number"
                  min={selectedProduct.costPrice}
                  required
                  value={markupPrice}
                  onChange={(e) => setMarkupPrice(parseFloat(e.target.value))}
                  className="w-full h-10 rounded border border-gray-200 px-3 text-[12px] font-black text-[#f04438] focus:outline-none focus:border-[#f04438]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider">Custom description</label>
                <textarea
                  rows={3}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#f04438]"
                />
              </div>

              {markupPrice > selectedProduct.costPrice && (
                <div className="flex justify-between rounded bg-[#f04438]/10 px-3 py-2.5 text-[12px] text-[#c0392b] border border-[#f04438]/20">
                  <span>Profit per sale</span>
                  <strong className="font-black">{formatMoney(markupPrice - selectedProduct.costPrice)}</strong>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-5">
              <button
                type="submit"
                className="w-full h-11 rounded bg-[#151515] text-[12px] font-black text-white hover:bg-[#f04438] transition-colors"
              >
                Publish to my storefront
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
