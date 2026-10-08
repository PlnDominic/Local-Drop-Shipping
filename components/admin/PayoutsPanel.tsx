'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Check, RefreshCw, Send, Settings2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import {
  adminPayoutAction,
  getPayoutSettings,
  networkLabel,
  PAYOUT_STATUS_LABEL,
  PAYOUT_STATUS_STYLE,
  type PayoutRequest,
  type PayoutSettings,
} from '../../lib/payouts';
import { useToast } from '../Toast';

type Row = PayoutRequest & {
  users: { full_name: string; email: string; role: string } | null;
};

const money = (n: number | string | null | undefined) =>
  `GHS ${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

type Filter = 'review' | 'sending' | 'paid' | 'returned' | 'all';

const OUTCOME_MESSAGE: Record<string, string> = {
  paid: 'Sent. The money has reached their mobile money account.',
  pending: 'Sent to Paystack. It usually completes within minutes; the page updates when Paystack confirms.',
  received: 'Sent to Paystack. It usually completes within minutes; the page updates when Paystack confirms.',
  otp: 'Paystack is asking for the OTP it sent to the Paystack account owner. Enter it below.',
  failed: 'The transfer failed. The money is back in their wallet.',
  requeued: 'Paystack has no record of it, so nothing was sent. It is back in the review queue.',
};

/** Admin: review withdrawal requests, send them with Paystack, and set limits and fees. */
export const PayoutsPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('review');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [otps, setOtps] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [settings, setSettings] = useState<PayoutSettings | null>(null);
  const [draft, setDraft] = useState<Record<keyof PayoutSettings, string>>({
    minAmount: '', maxAmount: '', dailyLimit: '', feeFlat: '', feePercent: '', paused: 'false',
  });
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async () => {
    const [list, s] = await Promise.all([
      supabase
        .from('payout_requests')
        .select('*, users!payout_requests_user_id_fkey(full_name, email, role)')
        .order('created_at', { ascending: false })
        .limit(200),
      getPayoutSettings(),
    ]);
    if (list.error || !s) {
      setError('Could not load withdrawals. Apply supabase/payouts.sql first.');
    } else {
      setError('');
      setRows(list.data as unknown as Row[]);
      setSettings(s);
      setDraft({
        minAmount: String(s.minAmount), maxAmount: String(s.maxAmount), dailyLimit: String(s.dailyLimit),
        feeFlat: String(s.feeFlat), feePercent: String(s.feePercent), paused: String(s.paused),
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    review: rows.filter((r) => r.status === 'pending').length,
    sending: rows.filter((r) => r.status === 'processing').length,
    paid: rows.filter((r) => r.status === 'paid').length,
    returned: rows.filter((r) => ['failed', 'rejected', 'cancelled'].includes(r.status)).length,
    all: rows.length,
  }), [rows]);

  const visible = rows.filter((r) =>
    filter === 'all' ? true
    : filter === 'review' ? r.status === 'pending'
    : filter === 'sending' ? r.status === 'processing'
    : filter === 'paid' ? r.status === 'paid'
    : ['failed', 'rejected', 'cancelled'].includes(r.status));

  const waitingTotal = rows.filter((r) => r.status === 'pending').reduce((n, r) => n + Number(r.net_amount), 0);

  const finish = async (ok: string) => {
    showToast(ok, 'success');
    await load();
    onChanged?.();
  };

  const runPaystack = async (r: Row, action: 'send' | 'check' | 'otp') => {
    if (action === 'send' && !window.confirm(
      `Send ${money(r.net_amount)} to ${networkLabel(r.network)} ${r.account_number} (${r.account_name})?\n\nThis pays out real money from the Paystack balance.`,
    )) return;
    setBusy(r.id);
    try {
      const result = await adminPayoutAction(r.id, action, action === 'otp' ? otps[r.id] : undefined);
      await finish(OUTCOME_MESSAGE[result] ?? `Status: ${result}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Something went wrong.', 'error');
      await load();
    } finally {
      setBusy(null);
    }
  };

  const runRpc = async (r: Row, fn: 'reject_payout' | 'mark_payout_paid_manually', ok: string) => {
    if (!notes[r.id]?.trim()) {
      showToast(fn === 'reject_payout' ? 'Write a reason for the owner first.' : 'Say how it was paid (for example the MoMo transaction ID).', 'error');
      return;
    }
    setBusy(r.id);
    const { error: err } = await supabase.rpc(fn, { p_id: r.id, p_note: notes[r.id] });
    setBusy(null);
    if (err) return showToast(err.message, 'error');
    await finish(ok);
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('settings');
    const { error: err } = await supabase.rpc('set_payout_settings', {
      p_settings: {
        minAmount: Number(draft.minAmount), maxAmount: Number(draft.maxAmount), dailyLimit: Number(draft.dailyLimit),
        feeFlat: Number(draft.feeFlat), feePercent: Number(draft.feePercent), paused: draft.paused === 'true',
      },
    });
    setBusy(null);
    if (err) return showToast(err.message, 'error');
    await finish('Payout settings saved.');
  };

  const tabs: { id: Filter; label: string }[] = [
    { id: 'review', label: 'Needs review' }, { id: 'sending', label: 'Sending' }, { id: 'paid', label: 'Sent' },
    { id: 'returned', label: 'Returned to wallet' }, { id: 'all', label: 'All' },
  ];
  const input = 'h-9 w-full rounded border border-gray-200 px-3 text-[12px] outline-none focus:border-[#f04438]';

  return (
    <section className="bg-white rounded border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Banknote size={16} className="text-[#f04438]" />
            <h2 className="text-[15px] font-black text-[#151515]">Withdrawals</h2>
            {settings?.paused && <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 text-[9px] font-black uppercase tracking-wider">Paused</span>}
          </div>
          <button type="button" onClick={() => setShowSettings((v) => !v)} className="h-8 rounded border border-gray-200 px-3 text-[11px] font-black text-[#555] hover:border-[#f04438] flex items-center gap-1.5">
            <Settings2 size={13} /> Limits &amp; fee
          </button>
        </div>
        <p className="text-[12px] text-[#777]">
          Each request already holds the money from the owner&apos;s wallet. Sending pays it from your Paystack balance to their mobile money.
          {counts.review > 0 && <> Waiting: <strong className="text-[#151515]">{money(waitingTotal)}</strong> across {counts.review} request{counts.review === 1 ? '' : 's'}.</>}
        </p>

        {showSettings && (
          <form onSubmit={saveSettings} className="rounded border border-gray-100 bg-[#fafafa] p-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {([
                ['minAmount', 'Minimum (GHS)'], ['maxAmount', 'Maximum per withdrawal (GHS)'], ['dailyLimit', 'Per person per 24 hours (GHS)'],
                ['feeFlat', 'Fee, flat (GHS)'], ['feePercent', 'Fee, percent (%)'],
              ] as [keyof PayoutSettings, string][]).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider">{label}</span>
                  <input type="number" step="0.01" min="0" required value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className={input} />
                </label>
              ))}
              <label className="block">
                <span className="block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider">New requests</span>
                <select value={draft.paused} onChange={(e) => setDraft({ ...draft, paused: e.target.value })} className={`${input} bg-white`}>
                  <option value="false">Open</option>
                  <option value="true">Paused</option>
                </select>
              </label>
            </div>
            <button type="submit" disabled={busy === 'settings'} className="h-9 rounded bg-[#151515] px-4 text-[12px] font-black text-white hover:bg-[#f04438] disabled:opacity-50">Save</button>
          </form>
        )}

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
          {visible.map((r) => (
            <li key={r.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-[#151515]">
                    {money(r.net_amount)} to {r.network ? `${networkLabel(r.network)} ${r.account_number ?? ''}` : 'unknown account'}
                  </p>
                  <p className="text-[11px] text-[#999]">
                    {r.users?.full_name || r.users?.email || 'Unknown'} ({r.users?.role ?? '—'}) · name on account: {r.account_name || '—'}
                    {' · '}held {money(r.amount)}{Number(r.fee) > 0 ? `, fee ${money(r.fee)}` : ''} · {when(r.created_at)}
                  </p>
                  <p className="text-[10px] font-mono text-[#bbb]">{r.reference}</p>
                </div>
                <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider ${PAYOUT_STATUS_STYLE[r.status]}`}>
                  {r.paid_manually ? 'Paid by hand' : PAYOUT_STATUS_LABEL[r.status]}
                </span>
              </div>

              {r.last_error && (r.status === 'pending' || r.status === 'processing' || r.status === 'failed') && (
                <p className="rounded bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-700">{r.last_error}</p>
              )}
              {r.admin_note && <p className="text-[12px] text-[#777]">Note: {r.admin_note}</p>}

              {r.status === 'pending' && (
                <div className="space-y-2">
                  <input value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="Reason (to decline) or how it was paid (if paid by hand)" className={input} />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy === r.id || !r.network} onClick={() => runPaystack(r, 'send')} className="h-9 rounded bg-[#151515] px-4 text-[12px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center gap-1.5 disabled:opacity-50">
                      <Send size={13} /> {busy === r.id ? 'Sending…' : `Send ${money(r.net_amount)}`}
                    </button>
                    <button type="button" disabled={busy === r.id} onClick={() => runRpc(r, 'reject_payout', 'Declined. The money is back in their wallet.')} className="h-9 rounded border border-gray-200 px-4 text-[12px] font-black text-[#777] hover:border-red-300 hover:text-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                      <X size={13} /> Decline
                    </button>
                    <button type="button" disabled={busy === r.id} onClick={() => runRpc(r, 'mark_payout_paid_manually', 'Marked as paid by hand.')} className="h-9 rounded border border-gray-200 px-4 text-[12px] font-black text-[#777] hover:border-emerald-300 hover:text-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                      <Check size={13} /> Paid by hand
                    </button>
                  </div>
                  {!r.network && <p className="text-[11px] text-[#999]">No mobile money network on this request (it was made before automatic payouts). Pay it by hand or decline it.</p>}
                </div>
              )}

              {r.status === 'processing' && (
                <div className="space-y-2">
                  {r.transfer_status === 'otp' && (
                    <div className="flex flex-wrap gap-2">
                      <input inputMode="numeric" value={otps[r.id] ?? ''} onChange={(e) => setOtps({ ...otps, [r.id]: e.target.value })} placeholder="OTP from Paystack" className="h-9 w-40 rounded border border-gray-200 px-3 text-[12px] outline-none focus:border-[#f04438]" />
                      <button type="button" disabled={busy === r.id || !otps[r.id]} onClick={() => runPaystack(r, 'otp')} className="h-9 rounded bg-[#151515] px-4 text-[12px] font-black text-white hover:bg-[#f04438] disabled:opacity-50">Confirm OTP</button>
                    </div>
                  )}
                  <button type="button" disabled={busy === r.id} onClick={() => runPaystack(r, 'check')} className="h-9 rounded border border-gray-200 px-4 text-[12px] font-black text-[#555] hover:border-[#f04438] flex items-center gap-1.5 disabled:opacity-50">
                    <RefreshCw size={13} /> Check status{r.transfer_status ? ` (${r.transfer_status})` : ''}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
