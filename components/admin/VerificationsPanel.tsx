'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Check, ExternalLink, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../Toast';

interface Row {
  supplier_id: string;
  ghana_card_number: string;
  business_reg_number: string | null;
  ghana_card_front_path: string;
  ghana_card_back_path: string | null;
  business_doc_path: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  supplier_profiles: { business_name: string; region: string | null } | null;
}

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Admin queue for supplier identity/business verification. Documents open through short-lived signed links. */
export const VerificationsPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('supplier_verifications')
      .select('*, supplier_profiles(business_name, region)')
      .order('submitted_at', { ascending: false })
      .limit(200);
    if (err) setError('Could not load verifications. Apply supabase/launch-features.sql first.');
    else { setError(''); setRows(data as unknown as Row[]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDoc = async (path: string) => {
    const { data, error: err } = await supabase.storage.from('supplier-documents').createSignedUrl(path, 300);
    if (err || !data?.signedUrl) return showToast('Could not open that document.', 'error');
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const review = async (r: Row, approve: boolean) => {
    if (!approve && !reasons[r.supplier_id]?.trim()) return showToast('Tell the supplier what to fix first.', 'error');
    setBusy(r.supplier_id);
    const { error: err } = await supabase.rpc('review_supplier_verification', {
      p_supplier_id: r.supplier_id, p_approve: approve, p_reason: approve ? null : reasons[r.supplier_id],
    });
    setBusy(null);
    if (err) return showToast(err.message, 'error');
    showToast(approve ? 'Supplier verified. The badge is now live.' : 'Sent back to the supplier.', 'success');
    await load();
    onChanged?.();
  };

  const visible = rows.filter((r) => r.status === filter);
  const count = (s: Row['status']) => rows.filter((r) => r.status === s).length;

  return (
    <section className="bg-white rounded border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <BadgeCheck size={16} className="text-[#f04438]" />
          <h2 className="text-[15px] font-black text-[#151515]">Supplier verification</h2>
        </div>
        <div className="flex gap-1.5">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={`h-8 rounded px-3 text-[11px] font-black capitalize transition-colors ${filter === s ? 'bg-[#151515] text-white' : 'bg-gray-100 text-[#555] hover:bg-gray-200'}`}>
              {s} <span className="opacity-60">{count(s)}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#999]">Check that the name and photo on the Ghana Card match the business owner and that the number is typed correctly. Document links expire after 5 minutes.</p>
      </div>

      {error ? (
        <div className="p-5"><div className="rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">{error}</div></div>
      ) : loading ? (
        <div className="p-5"><div className="h-24 rounded bg-gray-100 animate-pulse" /></div>
      ) : visible.length === 0 ? (
        <div className="p-10 text-center text-[13px] text-[#999]">Nothing {filter} right now.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {visible.map((r) => (
            <li key={r.supplier_id} className="p-4 space-y-3">
              <div>
                <p className="text-[14px] font-black text-[#151515]">{r.supplier_profiles?.business_name || 'Supplier'}</p>
                <p className="text-[11px] text-[#999]">{r.supplier_profiles?.region || '—'} · submitted {date(r.submitted_at)}</p>
              </div>
              <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
                <div><dt className="text-[10px] font-black uppercase tracking-wider text-[#999]">Ghana Card number</dt><dd className="font-mono font-bold text-[#151515]">{r.ghana_card_number}</dd></div>
                <div><dt className="text-[10px] font-black uppercase tracking-wider text-[#999]">Business registration</dt><dd className="font-bold text-[#151515]">{r.business_reg_number || '—'}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Card (front)', path: r.ghana_card_front_path },
                  { label: 'Card (back)', path: r.ghana_card_back_path },
                  { label: 'Business document', path: r.business_doc_path },
                ].filter((d) => d.path).map((d) => (
                  <button key={d.label} type="button" onClick={() => openDoc(d.path as string)}
                    className="h-9 rounded border border-gray-200 px-3 text-[11px] font-black text-[#555] hover:border-[#151515] hover:text-[#151515] transition-colors flex items-center gap-1.5">
                    <ExternalLink size={12} /> {d.label}
                  </button>
                ))}
              </div>

              {r.status === 'pending' ? (
                <div className="space-y-2">
                  <textarea value={reasons[r.supplier_id] ?? ''} onChange={(e) => setReasons({ ...reasons, [r.supplier_id]: e.target.value })} rows={2} placeholder="If sending back: what should the supplier fix? (shown to them)" className="w-full rounded border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-[#f04438] resize-none" />
                  <div className="flex gap-2">
                    <button type="button" disabled={busy === r.supplier_id} onClick={() => review(r, true)} className="h-9 rounded bg-[#151515] px-4 text-[12px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center gap-1.5 disabled:opacity-50"><Check size={13} /> Verify supplier</button>
                    <button type="button" disabled={busy === r.supplier_id} onClick={() => review(r, false)} className="h-9 rounded border border-gray-200 px-4 text-[12px] font-black text-[#777] hover:border-red-300 hover:text-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"><X size={13} /> Send back</button>
                  </div>
                </div>
              ) : r.status === 'rejected' ? (
                <p className="text-[12px] text-red-700">Sent back: {r.rejection_reason}</p>
              ) : (
                <p className="text-[12px] text-emerald-700 font-semibold">Verified {r.reviewed_at ? date(r.reviewed_at) : ''}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
