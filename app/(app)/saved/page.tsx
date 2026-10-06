'use client';

import React from 'react';
import Link from 'next/link';
import { OptimizedImage } from '../../../components/ui/OptimizedImage';
import { Heart, Package } from 'lucide-react';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useGlobalStore } from '../../../store/globalStore';
import { useToast } from '../../../components/Toast';
import { SaveButton } from '../../../components/SaveButton';

const money = (n: number) => `GHS ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function SavedItemsPage() {
  const { session, loading } = useAuth();
  const { showToast } = useToast();
  const hydrated = useGlobalStore((s) => s.hydrated);
  const catalog = useGlobalStore((s) => s.catalog);
  const savedIds = useGlobalStore((s) => s.savedIds);
  const addToCart = useGlobalStore((s) => s.addToCart);

  if (loading || (session && !hydrated)) {
    return <div className="min-h-[60vh] grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" /></div>;
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Heart size={40} className="mx-auto text-[#f04438]" />
        <h1 className="mt-4 text-2xl font-black text-[#151515]">Saved items</h1>
        <p className="mt-2 text-[13px] text-[#777]">Sign in to keep a list of products you like and find them again later.</p>
        <Link href="/login" className="mt-5 inline-block h-11 rounded bg-[#151515] px-6 text-[13px] font-black leading-[44px] text-white hover:bg-[#f04438] transition-colors">Sign in</Link>
      </div>
    );
  }

  // Items that were unpublished since they were saved simply drop out of view.
  const items = savedIds.map((id) => catalog.find((c) => c.id === id)).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="bg-[#F9FAFB] min-h-[80vh]">
      <div className="max-w-[1100px] mx-auto px-4 py-8">
        <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest">Account</p>
        <h1 className="text-[26px] font-black text-[#151515]">Saved items</h1>
        <p className="text-[12px] text-[#777]">Products you saved for later. Prices and availability are always up to date.</p>

        {items.length === 0 ? (
          <div className="mt-6 rounded border border-dashed border-gray-200 bg-white p-12 text-center">
            <Heart size={36} className="mx-auto text-gray-300" />
            <p className="mt-3 font-black text-[#151515]">Nothing saved yet</p>
            <p className="mt-1 text-[12px] text-[#999]">Tap the heart on any product to keep it here.</p>
            <Link href="/marketplace" className="mt-4 inline-block text-[13px] font-bold text-[#f04438] hover:underline">Browse products</Link>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const hasOptions = item.product.variants.length > 0;
              return (
                <li key={item.id} className="rounded border border-gray-100 bg-white">
                  <div className="relative aspect-square overflow-hidden rounded-t bg-[#f7f7f7]">
                    <SaveButton dropshipperProductId={item.id} className="absolute right-2 top-2 z-10" />
                    <Link href={`/product/${item.id}`} className="flex h-full w-full items-center justify-center" aria-label={item.product.name}>
                      {item.product.images[0] ? (
                        <OptimizedImage src={item.product.images[0]} alt={item.product.name} width={300} className="h-full w-full object-contain p-4 mix-blend-multiply" />
                      ) : (
                        <Package size={36} className="text-gray-300" />
                      )}
                    </Link>
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-2 text-[13px] font-bold leading-tight text-[#151515] hover:text-[#f04438]">
                      <Link href={`/product/${item.id}`}>{item.product.name}</Link>
                    </h2>
                    <p className="mt-2 text-[15px] font-black text-[#f04438]">{money(item.sellingPrice)}</p>
                    {hasOptions ? (
                      <Link href={`/product/${item.id}`} className="mt-3 flex h-9 w-full items-center justify-center rounded bg-[#151515] text-[11px] font-black text-white transition-colors hover:bg-[#f04438]">Select options</Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { addToCart(item.id); showToast('Added to your cart.', 'success'); }}
                        className="mt-3 h-9 w-full rounded bg-[#151515] text-[11px] font-black text-white transition-colors hover:bg-[#f04438]"
                      >
                        Add to cart
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
