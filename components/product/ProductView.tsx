'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, ChevronLeft, ChevronRight, Link2, Minus, Package, Plus, RotateCcw, Share2, ShoppingCart, Store, Truck } from 'lucide-react';
import { useGlobalStore } from '../../store/globalStore';
import { useToast } from '../Toast';
import { SaveButton } from '../SaveButton';
import { VerifiedBadge } from '../SupplierName';
import type { ProductPageData } from '../../lib/server/catalog';
import { absoluteUrl } from '../../lib/seo';

const money = (n: number) => `GHS ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

/** Interactive part of a product page: gallery, options, quantity, cart, save and share. */
export const ProductView: React.FC<{ data: ProductPageData; inStock: boolean }> = ({ data, inStock }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const addToCart = useGlobalStore((s) => s.addToCart);
  const catalog = useGlobalStore((s) => s.catalog);

  const [imgIndex, setImgIndex] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const hasOptions = data.variants.length > 0;
  const variant = data.variants.find((v) => v.id === variantId) ?? null;
  const images = data.images;
  const price = data.price + (variant?.priceAdjustment ?? 0);
  const lowest = hasOptions ? data.price + Math.min(...data.variants.map((v) => v.priceAdjustment)) : data.price;
  const discount = data.suggestedPrice > price ? Math.round(((data.suggestedPrice - price) / data.suggestedPrice) * 100) : 0;
  const sku = `${data.sku}${variant?.skuSuffix ?? ''}` || null;
  const optionStock = variant?.stockQty ?? 0;
  const maxQty = hasOptions ? Math.max(1, Math.min(10, optionStock || 10)) : 10;
  const needsChoice = hasOptions && !variant;
  const canBuy = inStock && !needsChoice && (!hasOptions || optionStock > 0);

  const related = useMemo(
    () =>
      catalog
        .filter((c) => c.id !== data.id && data.category && c.product.categoryId === data.category.id)
        .slice(0, 4),
    [catalog, data.id, data.category],
  );

  const add = (goToCart: boolean) => {
    const choice = variant ? { id: variant.id, label: variant.label } : undefined;
    for (let i = 0; i < qty; i++) addToCart(data.id, choice);
    if (goToCart) router.push('/marketplace?cart=1');
    else showToast(`Added ${qty > 1 ? `${qty} × ` : ''}${data.name} to your cart.`, 'success');
  };

  const url = absoluteUrl(`/product/${data.id}`);
  const share = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(`${data.name} - ${money(price)} on Local Drop Shipping GH: ${url}`)}`, '_blank', 'noopener');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied!', 'success');
    } catch {
      showToast(url, 'info');
    }
  };

  const prev = () => setImgIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setImgIndex((i) => (i + 1) % images.length);

  return (
    <div className="bg-[#F9FAFB] min-h-[80vh]">
      <div className="max-w-[1100px] mx-auto px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-[#999]">
          <Link href="/" className="hover:text-[#f04438]">Home</Link> /
          <Link href="/marketplace" className="hover:text-[#f04438]">Marketplace</Link> /
          {data.category && (
            <>
              <Link href={`/marketplace?category=${data.category.slug}`} className="hover:text-[#f04438]">{data.category.name}</Link> /
            </>
          )}
          <span className="text-[#555] truncate max-w-[50vw]">{data.name}</span>
        </nav>

        <div className="grid gap-6 md:grid-cols-2 items-start">
          {/* ── Gallery ── */}
          <section aria-label="Product photos">
            <div className="relative aspect-square overflow-hidden rounded border border-gray-100 bg-white">
              {images.length > 0 ? (
                <img src={images[imgIndex]} alt={images.length > 1 ? `${data.name}, photo ${imgIndex + 1} of ${images.length}` : data.name} className="h-full w-full object-contain p-4" />
              ) : (
                <div className="grid h-full w-full place-items-center text-gray-300"><Package size={64} /></div>
              )}
              {discount > 0 && <span className="absolute left-3 top-3 rounded bg-[#f04438] px-2 py-1 text-[11px] font-black text-white">-{discount}%</span>}
              {images.length > 1 && (
                <>
                  <button type="button" onClick={prev} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow hover:bg-white"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={next} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow hover:bg-white"><ChevronRight size={18} /></button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <ul className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((src, i) => (
                  <li key={src + i}>
                    <button
                      type="button"
                      onClick={() => setImgIndex(i)}
                      aria-label={`Show photo ${i + 1}`}
                      aria-current={i === imgIndex}
                      className={`h-16 w-16 overflow-hidden rounded border bg-white ${i === imgIndex ? 'border-[#f04438]' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Details ── */}
          <section>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#f04438]">{data.category?.name ?? 'Product'}</p>
            <h1 className="mt-1 text-[26px] font-black leading-tight text-[#151515]">{data.name}</h1>

            <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#777]">
              <span>By {data.supplier.name || 'a local supplier'}</span>
              {data.supplier.verified && <VerifiedBadge />}
              {data.store.slug && (
                <Link href={`/store/${data.store.slug}`} className="inline-flex items-center gap-1 font-bold text-[#151515] hover:text-[#f04438]">
                  <Store size={12} /> Sold by {data.store.name}
                </Link>
              )}
            </p>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-[30px] font-black text-[#f04438]">
                {needsChoice && <span className="mr-1 text-[13px] font-bold text-[#999]">From</span>}
                {money(needsChoice ? lowest : price)}
              </span>
              {discount > 0 && <span className="text-[14px] text-[#bbb] line-through">{money(data.suggestedPrice)}</span>}
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12px]">
              <span className={`font-black ${canBuy || (needsChoice && inStock) ? 'text-emerald-600' : 'text-red-600'}`}>
                {inStock ? (hasOptions && variant && optionStock <= 0 ? 'This option is out of stock' : 'In stock') : 'Out of stock'}
              </span>
              {sku && <span className="text-[#999]">SKU: <span className="font-mono text-[#555]">{sku}</span></span>}
            </p>

            {hasOptions && (
              <fieldset className="mt-5">
                <legend className="text-[11px] font-black uppercase tracking-wider text-[#777]">
                  Choose an option{variant ? `: ${variant.label}` : ''}
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.variants.map((v) => {
                    const out = v.stockQty <= 0;
                    const on = v.id === variantId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={out}
                        aria-pressed={on}
                        onClick={() => { setVariantId(v.id); setQty(1); }}
                        className={`rounded border px-3 py-2 text-[12px] font-bold transition-colors ${
                          on ? 'border-[#f04438] bg-[#f04438]/10 text-[#f04438]' : 'border-gray-200 text-[#333] hover:border-gray-400'
                        } disabled:cursor-not-allowed disabled:text-gray-300 disabled:line-through`}
                      >
                        {v.label}
                        {v.priceAdjustment !== 0 && <span className="ml-1 text-[10px] font-semibold text-[#999]">{v.priceAdjustment > 0 ? '+' : '−'}{money(Math.abs(v.priceAdjustment))}</span>}
                        {out && <span className="ml-1 text-[10px] no-underline">(sold out)</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex h-11 items-center rounded border border-gray-200 bg-white" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity" className="grid h-11 w-10 place-items-center disabled:opacity-30"><Minus size={14} /></button>
                <span className="w-8 text-center text-[14px] font-black" aria-live="polite">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity" className="grid h-11 w-10 place-items-center disabled:opacity-30"><Plus size={14} /></button>
              </div>
              <button
                type="button"
                disabled={!canBuy}
                onClick={() => add(false)}
                className="inline-flex h-11 flex-1 min-w-[150px] items-center justify-center gap-2 rounded bg-[#151515] px-5 text-[13px] font-black text-white transition-colors hover:bg-[#f04438] disabled:opacity-40 disabled:hover:bg-[#151515]"
              >
                <ShoppingCart size={16} /> Add to cart
              </button>
              <button
                type="button"
                disabled={!canBuy}
                onClick={() => add(true)}
                className="inline-flex h-11 min-w-[110px] items-center justify-center rounded bg-[#f04438] px-5 text-[13px] font-black text-white transition-colors hover:bg-[#c0392b] disabled:opacity-40"
              >
                Buy now
              </button>
            </div>
            {needsChoice && inStock && <p className="mt-2 text-[12px] font-semibold text-[#f04438]">Choose an option above to continue.</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SaveButton dropshipperProductId={data.id} variant="pill" />
              <button type="button" onClick={share} className="inline-flex h-11 items-center gap-2 rounded border border-gray-200 px-4 text-[12px] font-black text-[#555] hover:border-[#151515] hover:text-[#151515] transition-colors"><Share2 size={15} /> Share on WhatsApp</button>
              <button type="button" onClick={copy} aria-label="Copy link" className="grid h-11 w-11 place-items-center rounded border border-gray-200 text-[#555] hover:border-[#151515] transition-colors"><Link2 size={15} /></button>
            </div>

            <ul className="mt-5 space-y-2 rounded border border-gray-100 bg-white p-4 text-[12px] text-[#555]">
              <li className="flex gap-2"><Truck size={15} className="mt-0.5 flex-shrink-0 text-[#f04438]" /> Delivered across all 16 regions. Your exact delivery fee and time show at checkout. <Link href="/shipping" className="font-bold text-[#f04438] hover:underline">Shipping policy</Link></li>
              <li className="flex gap-2"><RotateCcw size={15} className="mt-0.5 flex-shrink-0 text-[#f04438]" /> Cancel free before it ships, or ask for a return within 7 days of delivery. <Link href="/returns" className="font-bold text-[#f04438] hover:underline">Returns policy</Link></li>
              {data.supplier.verified && <li className="flex gap-2"><BadgeCheck size={15} className="mt-0.5 flex-shrink-0 text-emerald-600" /> This supplier&apos;s identity and business documents were checked by us.</li>}
            </ul>
          </section>
        </div>

        {/* ── Description + specs ── */}
        <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr] items-start">
          <section className="rounded border border-gray-100 bg-white p-5">
            <h2 className="text-[16px] font-black text-[#151515]">About this product</h2>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-[#444]">{data.description || 'No description has been added yet.'}</p>
          </section>
          {data.specs.length > 0 && (
            <section className="rounded border border-gray-100 bg-white p-5">
              <h2 className="text-[16px] font-black text-[#151515]">Specifications</h2>
              <dl className="mt-3 divide-y divide-gray-100 text-[13px]">
                {data.specs.map((s) => (
                  <div key={s.label} className="flex justify-between gap-4 py-2">
                    <dt className="text-[#777]">{s.label}</dt>
                    <dd className="text-right font-semibold text-[#151515]">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        {related.length > 0 && (
          <section className="mt-8" aria-label="More in this category">
            <h2 className="text-[16px] font-black text-[#151515]">More in {data.category?.name}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/product/${r.id}`} className="block rounded border border-gray-100 bg-white p-3 hover:shadow-md transition-shadow">
                    <div className="aspect-square overflow-hidden rounded bg-[#f7f7f7]">
                      {r.product.images[0] ? (
                        <img src={r.product.images[0]} alt={r.product.name} loading="lazy" className="h-full w-full object-contain p-2 mix-blend-multiply" />
                      ) : (
                        <div className="grid h-full place-items-center text-gray-300"><Package size={28} /></div>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[12px] font-bold text-[#151515]">{r.product.name}</p>
                    <p className="text-[13px] font-black text-[#f04438]">{money(r.sellingPrice)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
