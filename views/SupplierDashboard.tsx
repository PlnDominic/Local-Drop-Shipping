'use client';

import React, { useState } from 'react';
import { useGlobalStore } from '../store/globalStore';
import type { ProductVariant } from '../store/globalStore';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  Package,
  Plus,
  Truck,
  Check,
  Search,
  MapPin,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Download,
  AlertTriangle,
} from 'lucide-react';

const formatMoney = (amount: number) =>
  `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

type Tab = 'products' | 'upload' | 'bulk' | 'orders';

// New-product form's working shape for a not-yet-saved variant row.
type DraftVariant = { label: string; skuSuffix: string; priceAdjustment: string; stockQty: string };

const emptyDraftVariant = (): DraftVariant => ({ label: '', skuSuffix: '', priceAdjustment: '', stockQty: '' });

const BULK_IMPORT_TEMPLATE =
  'name,description,category,costPrice,suggestedPrice,stockQty,sku,imageUrl\n' +
  'Leather Sandals,Handmade leather sandals,Fashion,80,120,40,LDR-SAN,https://example.com/sandal.jpg\n';

interface BulkRow {
  name: string;
  description: string;
  categoryId: string;
  costPrice: number;
  suggestedPrice: number;
  stockQty: number;
  sku: string;
  imageUrl: string;
  error?: string;
}

// Minimal CSV line splitter: handles quoted fields containing commas.
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

export const SupplierDashboard: React.FC = () => {
  const {
    products,
    orders,
    addSupplierProduct,
    addSupplierProductsBulk,
    updateSupplierProductStock,
    updateVariantStock,
    fulfillOrder,
    shipOrder,
    categories,
    wallets,
    currentUserId,
  } = useGlobalStore();

  const { profile } = useAuth();
  const uid = currentUserId ?? '';
  const businessName = profile?.fullName || 'My Wholesale Store';

  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [query, setQuery] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // New product form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sku, setSku] = useState('');
  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>([]);

  // Bulk import state
  const [csvText, setCsvText] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkError, setBulkError] = useState('');

  const supplierProducts = products
    .filter((p) => p.supplierId === uid)
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const supplierOrders = orders.filter((o) => o.supplierId === uid);
  const wallet = wallets[uid] || { balance: 0, totalEarned: 0 };
  const pendingCount = supplierOrders.filter((o) => ['pending', 'processing'].includes(o.status)).length;

  const handleProductUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const variants: ProductVariant[] = draftVariants
      .filter((v) => v.label.trim())
      .map((v, idx) => ({
        id: `variant-${Date.now()}-${idx}`,
        label: v.label.trim(),
        skuSuffix: v.skuSuffix.trim(),
        priceAdjustment: parseFloat(v.priceAdjustment) || 0,
        stockQty: parseInt(v.stockQty) || 0,
      }));

    addSupplierProduct({
      categoryId,
      name,
      description,
      images: imageUrl ? [imageUrl] : [],
      costPrice: parseFloat(costPrice) || 0,
      suggestedPrice: parseFloat(suggestedPrice) || 0,
      stockQty: parseInt(stockQty) || 0,
      sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      isActive: true,
      reviews: [],
      variants,
    });
    setName('');
    setDescription('');
    setCostPrice('');
    setSuggestedPrice('');
    setStockQty('');
    setImageUrl('');
    setSku('');
    setDraftVariants([]);
    setActiveTab('products');
  };

  const handleStockUpdate = (pId: string, newQty: string) => {
    const qty = parseInt(newQty);
    if (!isNaN(qty) && qty >= 0) updateSupplierProductStock(pId, qty);
  };

  const addDraftVariantRow = () => setDraftVariants((v) => [...v, emptyDraftVariant()]);
  const removeDraftVariantRow = (idx: number) =>
    setDraftVariants((v) => v.filter((_, i) => i !== idx));
  const updateDraftVariantRow = (idx: number, field: keyof DraftVariant, value: string) =>
    setDraftVariants((v) => v.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

  // ── Bulk import ──────────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const blob = new Blob([BULK_IMPORT_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const parseCsv = () => {
    setBulkError('');
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setBulkError('Add a header row plus at least one product row.');
      setBulkRows([]);
      return;
    }
    const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const required = ['name', 'costprice', 'suggestedprice', 'stockqty'];
    const missing = required.filter((r) => !header.includes(r));
    if (missing.length > 0) {
      setBulkError(`Missing required column(s): ${missing.join(', ')}`);
      setBulkRows([]);
      return;
    }

    const idx = (col: string) => header.indexOf(col);
    const rows: BulkRow[] = lines.slice(1).map((line) => {
      const cells = splitCsvLine(line);
      const get = (col: string) => (idx(col) >= 0 ? cells[idx(col)] ?? '' : '');
      const categoryName = get('category');
      const category = categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase() || c.slug === categoryName.toLowerCase(),
      );
      const rowName = get('name');
      const cost = parseFloat(get('costprice'));
      const suggested = parseFloat(get('suggestedprice'));
      const stock = parseInt(get('stockqty'));

      let error: string | undefined;
      if (!rowName) error = 'Missing product name';
      else if (isNaN(cost) || cost < 0) error = 'Invalid cost price';
      else if (isNaN(suggested) || suggested < 0) error = 'Invalid suggested price';
      else if (isNaN(stock) || stock < 0) error = 'Invalid stock quantity';
      else if (categoryName && !category) error = `Unknown category "${categoryName}"`;

      return {
        name: rowName,
        description: get('description'),
        categoryId: category?.id ?? '',
        costPrice: isNaN(cost) ? 0 : cost,
        suggestedPrice: isNaN(suggested) ? 0 : suggested,
        stockQty: isNaN(stock) ? 0 : stock,
        sku: get('sku') || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        imageUrl: get('imageurl'),
        error,
      };
    });
    setBulkRows(rows);
  };

  const validBulkRows = bulkRows.filter((r) => !r.error);

  const handleBulkImport = () => {
    if (validBulkRows.length === 0) return;
    const count = addSupplierProductsBulk(
      validBulkRows.map((r) => ({
        categoryId: r.categoryId,
        name: r.name,
        description: r.description,
        images: r.imageUrl ? [r.imageUrl] : [],
        costPrice: r.costPrice,
        suggestedPrice: r.suggestedPrice,
        stockQty: r.stockQty,
        sku: r.sku,
        isActive: true,
      })),
    );
    setCsvText('');
    setBulkRows([]);
    if (count > 0) setActiveTab('products');
  };

  const tabs: { id: Tab; label: string; icon: typeof Package; badge?: number }[] = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'upload', label: 'Upload Item', icon: Plus },
    { id: 'bulk', label: 'Bulk Import', icon: UploadCloud },
    { id: 'orders', label: 'Fulfillment', icon: Truck, badge: pendingCount },
  ];

  const inputClass =
    'w-full h-10 rounded border border-gray-200 px-3 text-[12px] focus:outline-none focus:border-[#f04438]';
  const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

  return (
    <div className="bg-[#F9FAFB] min-h-screen font-sans animate-fade-in">
      {/* ── Hero ── */}
      <div className="bg-[#151515] text-white">
        <div className="max-w-[1280px] mx-auto px-4 py-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest mb-1">Supplier Portal</p>
            <h1 className="text-[26px] font-black leading-tight">{businessName}</h1>
            <p className="text-gray-400 text-[12px] mt-1">List wholesale items and fulfill dropshipper orders.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Escrow</p>
              <p className="text-lg font-black text-white">{formatMoney(wallet.balance)}</p>
            </div>
            <div className="rounded bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">To Fulfill</p>
              <p className="text-lg font-black text-white">{pendingCount}</p>
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
                {t.badge ? (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${active ? 'bg-white/25' : 'bg-[#f04438] text-white'}`}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-5 space-y-4">

        {/* ── PRODUCTS ── */}
        {activeTab === 'products' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-black text-[#151515]">Wholesale Catalog</h2>
                <p className="text-[11px] text-[#888]">Manage listings, stock, and trade prices.</p>
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

            {supplierProducts.length === 0 ? (
              <div className="p-5">
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <Package size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">No products listed</p>
                  <p className="mt-2 text-sm text-[#777] max-w-xs">Upload your first wholesale product to start receiving dropshipper orders.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="mt-5 h-10 rounded bg-[#151515] px-6 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors"
                  >
                    Upload Item
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {supplierProducts.map((p) => {
                  const hasVariants = p.variants.length > 0;
                  const isExpanded = expandedProductId === p.id;
                  return (
                    <div key={p.id}>
                      <div className="flex flex-wrap items-center gap-4 p-4 hover:bg-[#fafafa] transition-colors">
                        <div className="h-14 w-14 flex-shrink-0 rounded bg-[#f7f7f7] grid place-items-center">
                          <img src={p.images[0]} alt="" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-1 text-[13px] font-bold text-[#151515]">{p.name}</h3>
                          <span className="text-[10px] text-[#999]">SKU {p.sku || '—'}</span>
                          {hasVariants && (
                            <button
                              type="button"
                              onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                              className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-[#f04438] hover:underline"
                            >
                              {p.variants.length} variant{p.variants.length !== 1 ? 's' : ''}
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                          )}
                        </div>
                        <div className="text-right min-w-[90px]">
                          <p className="text-[9px] uppercase tracking-wider text-[#999] font-bold">Wholesale</p>
                          <p className="text-[13px] font-black text-[#f04438]">{formatMoney(p.costPrice)}</p>
                        </div>
                        <div className="text-right min-w-[90px]">
                          <p className="text-[9px] uppercase tracking-wider text-[#999] font-bold">Retail</p>
                          <p className="text-[13px] font-bold text-[#555]">{formatMoney(p.suggestedPrice)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={p.stockQty}
                            onChange={(e) => handleStockUpdate(p.id, e.target.value)}
                            disabled={hasVariants}
                            title={hasVariants ? 'Managed per-variant below' : undefined}
                            className="w-20 h-9 rounded border border-gray-200 px-2 text-[12px] font-black text-[#151515] focus:outline-none focus:border-[#f04438] disabled:bg-gray-50 disabled:text-gray-400"
                          />
                          <span className="text-[10px] text-[#999]">units</span>
                        </div>
                      </div>

                      {hasVariants && isExpanded && (
                        <div className="bg-[#fafafa] px-4 pb-4">
                          <div className="rounded border border-gray-200 bg-white divide-y divide-gray-100">
                            {p.variants.map((v) => (
                              <div key={v.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12px] font-bold text-[#151515]">{v.label}</p>
                                  <p className="text-[10px] text-[#999]">
                                    SKU {p.sku}{v.skuSuffix}
                                    {v.priceAdjustment !== 0 && (
                                      <> · {v.priceAdjustment > 0 ? '+' : ''}{formatMoney(v.priceAdjustment)}</>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={v.stockQty}
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value);
                                      if (!isNaN(qty) && qty >= 0) updateVariantStock(p.id, v.id, qty);
                                    }}
                                    className="w-20 h-8 rounded border border-gray-200 px-2 text-[11px] font-black text-[#151515] focus:outline-none focus:border-[#f04438]"
                                  />
                                  <span className="text-[10px] text-[#999]">units</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── UPLOAD ── */}
        {activeTab === 'upload' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="text-[15px] font-black text-[#151515]">Upload Wholesale Product</h2>
              <p className="text-[11px] text-[#888]">Publish to the dropshipper catalog. Dropshippers handle the selling.</p>
            </div>
            <form onSubmit={handleProductUpload} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Product title</label>
                  <input type="text" required placeholder="e.g. Leather Sandals" value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} font-semibold`} />
                </div>
                <div>
                  <label className={labelClass}>Wholesale price (GHS)</label>
                  <input type="number" step="0.01" required placeholder="150" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className={`${inputClass} font-black text-[#f04438]`} />
                </div>
                <div>
                  <label className={labelClass}>Suggested retail (GHS)</label>
                  <input type="number" step="0.01" required placeholder="210" value={suggestedPrice} onChange={(e) => setSuggestedPrice(e.target.value)} className={`${inputClass} font-semibold text-[#555]`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={`${inputClass} bg-white`}>
                      <option value="" disabled>Select…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Initial stock</label>
                    <input type="number" required placeholder="50" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex flex-col">
                <div>
                  <label className={labelClass}>SKU code</label>
                  <input type="text" placeholder="e.g. LDR-SAN" value={sku} onChange={(e) => setSku(e.target.value)} className={`${inputClass} uppercase font-bold`} />
                </div>
                <div>
                  <label className={labelClass}>Photo URL</label>
                  <input type="text" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Description</label>
                  <textarea rows={4} required placeholder="Dimensions, material, region made…" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-[12px] focus:outline-none focus:border-[#f04438]" />
                </div>
              </div>

              {/* ── Variants ── */}
              <div className="md:col-span-2 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[12px] font-black text-[#151515]">Variants (optional)</p>
                    <p className="text-[10px] text-[#888]">Add size/color options with their own stock and price adjustment.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addDraftVariantRow}
                    className="h-8 rounded border border-gray-200 px-3 text-[11px] font-bold text-[#151515] hover:bg-gray-50 flex items-center gap-1"
                  >
                    <Plus size={13} /> Add variant
                  </button>
                </div>

                {draftVariants.length > 0 && (
                  <div className="space-y-2">
                    {draftVariants.map((v, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_90px_90px_36px] gap-2 items-center">
                        <input
                          type="text"
                          placeholder="e.g. Red / Large"
                          value={v.label}
                          onChange={(e) => updateDraftVariantRow(idx, 'label', e.target.value)}
                          className={`${inputClass} h-9`}
                        />
                        <input
                          type="text"
                          placeholder="SKU suffix e.g. -RED-L"
                          value={v.skuSuffix}
                          onChange={(e) => updateDraftVariantRow(idx, 'skuSuffix', e.target.value)}
                          className={`${inputClass} h-9`}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="±price"
                          value={v.priceAdjustment}
                          onChange={(e) => updateDraftVariantRow(idx, 'priceAdjustment', e.target.value)}
                          className={`${inputClass} h-9`}
                        />
                        <input
                          type="number"
                          placeholder="stock"
                          value={v.stockQty}
                          onChange={(e) => updateDraftVariantRow(idx, 'stockQty', e.target.value)}
                          className={`${inputClass} h-9`}
                        />
                        <button
                          type="button"
                          onClick={() => removeDraftVariantRow(idx)}
                          className="h-9 w-9 grid place-items-center rounded border border-gray-200 text-gray-400 hover:text-[#f04438] hover:border-[#f04438]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <button type="submit" className="w-full h-11 rounded bg-[#151515] text-[12px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5">
                  <Plus size={16} /> List wholesale item
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ── BULK IMPORT ── */}
        {activeTab === 'bulk' && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-black text-[#151515]">Bulk Import Products</h2>
                <p className="text-[11px] text-[#888]">Paste or upload a CSV to list many products at once.</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="h-9 rounded border border-gray-200 px-3 text-[11px] font-bold text-[#151515] hover:bg-gray-50 flex items-center gap-1.5 flex-shrink-0"
              >
                <Download size={13} /> CSV template
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Upload CSV file</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvFile(file);
                  }}
                  className="block w-full text-[11px] text-[#555] file:mr-3 file:h-9 file:rounded file:border-0 file:bg-[#151515] file:px-3 file:text-[11px] file:font-black file:text-white hover:file:bg-[#f04438]"
                />
              </div>

              <div>
                <label className={labelClass}>Or paste CSV</label>
                <textarea
                  rows={6}
                  placeholder={BULK_IMPORT_TEMPLATE}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-[11px] font-mono focus:outline-none focus:border-[#f04438]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={parseCsv}
                  disabled={!csvText.trim()}
                  className="h-10 rounded bg-[#151515] px-5 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors disabled:opacity-40"
                >
                  Preview
                </button>
                {bulkError && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#f04438]">
                    <AlertTriangle size={13} /> {bulkError}
                  </span>
                )}
              </div>

              {bulkRows.length > 0 && (
                <div>
                  <div className="rounded border border-gray-200 overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-[#f7f7f7] text-[10px] uppercase tracking-wider text-[#999]">
                        <tr>
                          <th className="text-left px-3 py-2 font-bold">Name</th>
                          <th className="text-right px-3 py-2 font-bold">Cost</th>
                          <th className="text-right px-3 py-2 font-bold">Retail</th>
                          <th className="text-right px-3 py-2 font-bold">Stock</th>
                          <th className="text-left px-3 py-2 font-bold">SKU</th>
                          <th className="text-left px-3 py-2 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bulkRows.map((r, idx) => (
                          <tr key={idx} className={r.error ? 'bg-red-50/50' : undefined}>
                            <td className="px-3 py-2 font-semibold text-[#151515]">{r.name || '—'}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(r.costPrice)}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(r.suggestedPrice)}</td>
                            <td className="px-3 py-2 text-right">{r.stockQty}</td>
                            <td className="px-3 py-2 text-[#777]">{r.sku}</td>
                            <td className="px-3 py-2">
                              {r.error ? (
                                <span className="text-[#f04438] font-bold">{r.error}</span>
                              ) : (
                                <span className="text-green-600 font-bold">Ready</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[11px] text-[#777]">
                      {validBulkRows.length} of {bulkRows.length} row{bulkRows.length !== 1 ? 's' : ''} ready to import.
                    </p>
                    <button
                      type="button"
                      onClick={handleBulkImport}
                      disabled={validBulkRows.length === 0}
                      className="h-10 rounded bg-[#151515] px-5 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <UploadCloud size={14} /> Import {validBulkRows.length || ''} product{validBulkRows.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── FULFILLMENT ── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white rounded border border-gray-100 px-4 py-4">
              <h2 className="text-[15px] font-black text-[#151515]">Fulfillment Queue</h2>
              <p className="text-[11px] text-[#888]">Acknowledge orders, pack, and dispatch via GhanaPost GPS.</p>
            </div>

            {supplierOrders.length === 0 ? (
              <div className="bg-white rounded border border-gray-100 p-5">
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
                  <Truck size={40} className="text-gray-300 mb-4" />
                  <p className="font-black text-[#151515] text-lg">Queue is empty</p>
                  <p className="mt-2 text-sm text-[#777] max-w-xs">New order requests will appear here in real time.</p>
                </div>
              </div>
            ) : (
              supplierOrders.map((o) => (
                <div key={o.id} className="bg-white rounded border border-gray-100 overflow-hidden">
                  <div className="border-b border-gray-100 px-4 py-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <strong className="text-[#f04438] font-black text-[13px]">{o.orderNumber}</strong>
                    <span className="text-gray-300">·</span>
                    <span className="text-[#888] font-semibold">{o.dropshipperStoreName || 'Dropshipper'}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-[#999]">{new Date(o.createdAt).toLocaleString()}</span>
                    <span className={`ml-auto px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                      o.status === 'delivered' || o.status === 'shipped' ? 'bg-[#f04438]/10 text-[#c0392b]' :
                      o.status === 'processing' ? 'bg-purple-50 text-purple-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>{o.status}</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
                    <div className="space-y-3">
                      <div className="rounded bg-[#f7f7f7] p-3 space-y-2">
                        {o.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-[12px] font-semibold">
                            <span className="text-[#151515]">{item.productName} <strong className="text-[#f04438]">×{item.quantity}</strong></span>
                            <span className="text-[#999]">{formatMoney(item.costPrice)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-[12px] font-black text-[#151515] border-t border-gray-200 pt-2">
                          <span>Payout pending</span>
                          <span className="text-[#f04438]">{formatMoney(o.costAmount)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div className="rounded border border-gray-100 p-3">
                          <strong className="block text-[#151515] font-black text-[10px] uppercase tracking-wider">Consignee</strong>
                          <span className="text-[#777] block mt-1">{o.deliveryAddress.fullName}</span>
                          <span className="text-[#777] block">{o.deliveryAddress.phone}</span>
                        </div>
                        <div className="rounded border border-gray-100 p-3">
                          <strong className="text-[#151515] font-black text-[10px] uppercase tracking-wider flex items-center gap-1"><MapPin size={11} /> GhanaPost GPS</strong>
                          <span className="text-[#777] block mt-1">{o.deliveryAddress.region}, {o.deliveryAddress.city}</span>
                          <strong className="text-[#f04438] block mt-0.5 uppercase">{o.deliveryAddress.ghanaPostGps}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-2 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-4">
                      {o.status === 'pending' && (
                        <button onClick={() => fulfillOrder(o.id)} className="w-full h-10 rounded bg-[#151515] text-[11px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5">
                          <Check size={14} /> Acknowledge
                        </button>
                      )}
                      {o.status === 'processing' && (
                        <button onClick={() => shipOrder(o.id)} className="w-full h-10 rounded bg-[#f04438] text-[11px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center justify-center gap-1.5">
                          <Truck size={14} /> Ship via GPS
                        </button>
                      )}
                      {['shipped', 'delivered'].includes(o.status) && (
                        <div className="flex items-center justify-center gap-1.5 rounded bg-[#f04438]/10 px-3 py-2.5 text-[11px] font-black text-[#c0392b] border border-[#f04438]/20">
                          <CheckCircle2 size={14} /> Dispatched
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
