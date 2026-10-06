'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../Toast';

interface Row { id: string; reference: string; amount: number | string; status: string; channel: string | null; created_at: string; paid_at: string | null }

const money = (n: number | string) => `GHS ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

/** Admin: switch online payment on and watch incoming payments. */
export const PaymentsPanel: React.FC = () => {
  const { showToast } = useToast();
  const [on, setOn] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [flag, list] = await Promise.all([
      supabase.rpc('payments_required'),
      supabase.from('checkout_payments').select('id, reference, amount, status, channel, created_at, paid_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (flag.error || list.error) setError('Apply supabase/payments.sql first.');
    else { setError(''); setOn(flag.data === true); setRows(list.data as Row[]); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = async () => {
    const next = !on;
    if (next && !window.confirm('Turn on online payment? Customers will pay at checkout, and unpaid orders are cancelled after 2 hours. Make sure PAYSTACK_SECRET_KEY and the Paystack webhook are set up first.')) return;
    setBusy(true);
    const { error: err } = await supabase.rpc('set_payments_required', { p_on: next });
    setBusy(false);
    if (err) { showToast(err.message, 'error'); return; }
    setOn(next);
    showToast(next ? 'Online payment is on.' : 'Online payment is off.', 'success');
  };

  const paid = rows.filter((r) => r.status === 'paid');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-gray-100 bg-white p-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-black"><CreditCard size={16} className="text-[#f04438]" /> Online payment (Paystack)</h2>
          <p className="mt-1 text-[12px] text-[#777]">
            {on ? 'On: customers must pay before an order can be packed or shipped.' : 'Off: orders are placed without payment (current behaviour).'}
          </p>
        </div>
        <button onClick={toggle} disabled={busy} className={`h-10 rounded px-5 text-[12px] font-black text-white disabled:opacity-60 ${on ? 'bg-[#151515]' : 'bg-[#f04438]'}`}>
          {on ? 'Turn off' : 'Turn on'}
        </button>
      </div>
      {error && <p className="rounded bg-[#fff5f4] border border-[#f04438]/30 px-3 py-2 text-[12px] text-[#c0392b]">{error}</p>}
      <p className="text-[12px] text-[#777]">{paid.length} paid · {money(paid.reduce((n, r) => n + Number(r.amount), 0))} collected (last 100 payments)</p>
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-[12px]">
          <thead className="bg-[#f5f5f5] text-left text-[10px] uppercase tracking-wider text-[#777]">
            <tr><th className="p-3">When</th><th className="p-3">Reference</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-[#777]">No payments yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-3 font-mono text-[11px]">{r.reference}</td>
                <td className="p-3 font-bold">{money(r.amount)}</td>
                <td className="p-3">{r.channel === 'mobile_money' ? 'Mobile money' : r.channel === 'card' ? 'Card' : '—'}</td>
                <td className="p-3 uppercase font-black text-[10px]">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
