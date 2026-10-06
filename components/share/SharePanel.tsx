'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useGlobalStore } from '../../store/globalStore';
import { supabase } from '../../lib/supabase/client';
import { ShareButtons } from './ShareButtons';

interface Stat {
  code: string;
  channel: string;
  product_id: string | null;
  product_name: string | null;
  clicks: number;
  orders: number;
  sales: number | string;
  last_7_days: number;
}

const money = (n: number | string) => `GHS ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const CHANNEL: Record<string, string> = { whatsapp: 'WhatsApp', facebook: 'Facebook', instagram: 'Instagram', other: 'Copied link' };

/** Dropshipper tab: share products with tracked links and see which links bring orders. */
export const SharePanel: React.FC = () => {
  const dropshipperProducts = useGlobalStore((s) => s.dropshipperProducts);
  const storeSlug = useGlobalStore((s) => s.dropshipperProfile?.storeSlug);
  const [stats, setStats] = useState<Stat[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('my_share_stats');
    if (err) setError('Share tracking needs the engagement database update (supabase/engagement-features.sql).');
    else { setError(''); setStats((data ?? []) as Stat[]); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const published = dropshipperProducts.filter((p) => p.isPublished);
  const totals = stats.reduce((t, s) => ({ clicks: t.clicks + s.clicks, orders: t.orders + s.orders, sales: t.sales + Number(s.sales) }), { clicks: 0, orders: 0, sales: 0 });

  return (
    <div className="space-y-5">
      <div className="rounded border border-gray-100 bg-white p-4">
        <h2 className="flex items-center gap-2 text-[14px] font-black text-[#151515]"><Share2 size={16} className="text-[#f04438]" /> Share and track</h2>
        <p className="mt-1 text-[12px] text-[#777]">
          Every button makes a link just for that channel. When someone orders after clicking it, the sale is credited to the link, so you can see what really sells.
        </p>
        {storeSlug && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded bg-[#f7f7f7] p-3">
            <span className="text-[12px] font-bold text-[#151515]">Your whole store</span>
            <ShareButtons productId={null} title="Shop my store" onShared={load} />
          </div>
        )}
        <ul className="mt-3 divide-y divide-gray-100">
          {published.length === 0 && <li className="py-4 text-[12px] text-[#777]">Import and publish products first, then share them here.</li>}
          {published.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="min-w-0 max-w-[260px] truncate text-[12px] font-bold text-[#151515]">{p.product.name}</span>
              <ShareButtons productId={p.productId} title={p.product.name} onShared={load} />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded border border-gray-100 bg-white p-4">
        <h3 className="text-[14px] font-black text-[#151515]">Which links sell</h3>
        {error && <p className="mt-2 text-[12px] text-[#c0392b]">{error}</p>}
        <p className="mt-1 text-[12px] text-[#777]">{totals.clicks} visits · {totals.orders} orders · {money(totals.sales)} in sales</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-left text-[10px] uppercase tracking-wider text-[#777]">
              <tr><th className="py-2 pr-3">Link</th><th className="pr-3">Channel</th><th className="pr-3 text-right">Visits</th><th className="pr-3 text-right">7 days</th><th className="pr-3 text-right">Orders</th><th className="text-right">Sales</th></tr>
            </thead>
            <tbody>
              {stats.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-[#777]">No shared links yet.</td></tr>}
              {stats.map((s) => (
                <tr key={s.code} className="border-t border-gray-100">
                  <td className="py-2 pr-3 max-w-[200px] truncate font-bold">{s.product_name ?? 'Whole store'}</td>
                  <td className="pr-3">{CHANNEL[s.channel] ?? s.channel}</td>
                  <td className="pr-3 text-right">{s.clicks}</td>
                  <td className="pr-3 text-right">{s.last_7_days}</td>
                  <td className="pr-3 text-right">{s.orders}</td>
                  <td className="text-right font-black text-[#f04438]">{money(s.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
