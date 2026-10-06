'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../Toast';

type Status = 'requested' | 'approved' | 'rejected' | 'completed';

interface Row {
  id: string;
  order_id: string;
  kind: 'return' | 'not_received';
  reason: string;
  status: Status;
  refund_amount: number | string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  customer_refunded_at: string | null;
  orders: {
    order_number: string | null;
    status: string;
    subtotal: number | string;
    platform_fee: number | string | null;
    delivery_fee: number | string | null;
    total: number | string;
    customer_name: string;
    customer_phone: string;
    dropshipper_profiles?: { store_name: string | null } | null;
  } | null;
}

const money = (n: number | string | null | undefined) =>
  `GHS ${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

type Filter = 'review' | 'payment' | 'done' | 'all';

/** Admin queue for customer return / not-received requests. */
export const RefundsPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('review');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [includeDelivery, setIncludeDelivery] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('refund_requests')
      .select('id, order_id, kind, reason, status, refund_amount, admin_note, created_at, resolved_at, customer_refunded_at, orders(order_number, status, subtotal, platform_fee, delivery_fee, total, customer_name, customer_phone, dropshipper_profiles(store_name))')
      .order('created_at', { ascending: false })
      .limit(200);
    if (err) setError('Could not load refund requests. Apply supabase/launch-features.sql first.');
    else { setError(''); setRows(data as unknown as Row[]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    review: rows.filter((r) => r.status === 'requested').length,
    payment: rows.filter((r) => r.status === 'approved').length,
    done: rows.filter((r) => r.status === 'completed' || r.status === 'rejected').length,
    all: rows.length,
  }), [rows]);

  const visible = rows.filter((r) =>
    filter === 'all' ? true
    : filter === 'review' ? r.status === 'requested'
    : filter === 'payment' ? r.status === 'approved'
    : r.status === 'completed' || r.status === 'rejected');

  const act = async (id: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(id);
    const { error: err } = await fn();
    setBusy(null);
    if (err) return showToast(err.message, 'error');
    showToast(ok, 'success');
    await load();
    onChanged?.();
  };

  const approve = (r: Row) =>
    act(r.id, () => supabase.rpc('resolve_refund', {
      p_request_id: r.id, p_approve: true, p_note: notes[r.id] || null, p_include_delivery: includeDelivery[r.id] ?? true,
    }), 'Approved. Earnings were taken back from the store and suppliers.');

  const reject = (r: Row) => {
    if (!notes[r.id]?.trim()) return showToast('Write a reason for the customer first.', 'error');
    return act(r.id, () => supabase.rpc('resolve_refund', { p_request_id: r.id, p_approve: false, p_note: notes[r.id] }), 'Request declined.');
  };

  const paid = (r: Row) =>
    act(r.id, () => supabase.rpc('complete_refund', { p_request_id: r.id, p_note: notes[r.id] || null }), 'Marked as paid back.');

  const tabs: { id: Filter; label: string }[] = [
    { id: 'review', label: 'Needs review' }, { id: 'payment', label: 'Pay customer' }, { id: 'done', label: 'Done' }, { id: 'all', label: 'All' },
  ];

  return (
    <section className="bg-white rounded border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw size={16} className="text-[#f04438]" />
          <h2 className="text-[15px] font-black text-[#151515]">Returns &amp; refunds</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setFilter(t.id)}
              className={`h-8 rounded px-3 text-[11px] font-black transition-colors ${filter === t.id ? 'bg-[#151515] text-white' : 'bg-gray-100 text-[#555] hover:bg-gray-200'}`}>
              {t.label} <span className="opacity-60">{counts[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-5"><div className="rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">{error}</div></div>
      ) : loading ? (
        <div className="p-5 space-y-2">{[0, 1].map((i) => <div key={i} className="h-24 rounded bg-gray-100 animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <div className="p-10 text-center text-[13px] text-[#999]">Nothing here.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {visible.map((r) => {
            const o = r.orders;
            const refundIfIncl = Number(o?.subtotal ?? 0) + Number(o?.platform_fee ?? 0) + Number(o?.delivery_fee ?? 0);
            const refundIfExcl = refundIfIncl - Number(o?.delivery_fee ?? 0);
            const incl = includeDelivery[r.id] ?? true;
            return (
              <li key={r.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-black text-[#151515]">
                      {o?.order_number ?? r.order_id.slice(0, 8)}
                      <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-[9px] font-black uppercase tracking-wider text-[#555]">{r.kind === 'not_received' ? 'Not received' : 'Return'}</span>
                    </p>
                    <p className="text-[11px] text-[#999]">
                      {o?.customer_name} · {o?.customer_phone} · store: {o?.dropshipper_profiles?.store_name || '—'} · order {money(o?.total)} · asked {date(r.created_at)}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                    r.status === 'requested' ? 'bg-yellow-50 text-yellow-700' : r.status === 'approved' ? 'bg-blue-50 text-blue-700' : r.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                </div>

                <p className="rounded bg-[#fafafa] border border-gray-100 px-3 py-2 text-[13px] text-[#333] whitespace-pre-wrap">{r.reason}</p>

                {r.status === 'requested' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[12px] font-semibold text-[#555]">
                      <input type="checkbox" checked={incl} onChange={(e) => setIncludeDelivery({ ...includeDelivery, [r.id]: e.target.checked })} className="accent-[#f04438]" />
                      Include the delivery fee in the refund (do this when the store or supplier was at fault) · customer gets <strong>{money(incl ? refundIfIncl : refundIfExcl)}</strong>
                    </label>
                    <textarea value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} rows={2} placeholder="Note to the customer (required when declining)" className="w-full rounded border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-[#f04438] resize-none" />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy === r.id} onClick={() => approve(r)} className="h-9 rounded bg-[#151515] px-4 text-[12px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center gap-1.5 disabled:opacity-50"><Check size={13} /> Approve refund</button>
                      <button type="button" disabled={busy === r.id} onClick={() => reject(r)} className="h-9 rounded border border-gray-200 px-4 text-[12px] font-black text-[#777] hover:border-red-300 hover:text-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"><X size={13} /> Decline</button>
                    </div>
                    <p className="text-[11px] text-[#999]">Approving marks the order refunded and takes back the store&apos;s commission and each supplier&apos;s payout.</p>
                  </div>
                )}

                {r.status === 'approved' && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-[#333]">Send <strong>{money(r.refund_amount)}</strong> to <strong>{o?.customer_name}</strong> on <strong>{o?.customer_phone}</strong>, then confirm below.</p>
                    <input value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="Payment reference (optional, shown to the customer)" className="h-9 w-full rounded border border-gray-200 px-3 text-[12px] outline-none focus:border-[#f04438]" />
                    <button type="button" disabled={busy === r.id} onClick={() => paid(r)} className="h-9 rounded bg-emerald-600 px-4 text-[12px] font-black text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"><Check size={13} /> Mark customer paid back</button>
                  </div>
                )}

                {(r.status === 'completed' || r.status === 'rejected') && (
                  <p className="text-[12px] text-[#777]">
                    {r.status === 'completed' ? `Paid back ${r.customer_refunded_at ? date(r.customer_refunded_at) : ''} (${money(r.refund_amount)}).` : 'Declined.'}
                    {r.admin_note ? ` Note: ${r.admin_note}` : ''}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
