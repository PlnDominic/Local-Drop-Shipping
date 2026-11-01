'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Check, ExternalLink, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../Toast';

type Kind = 'supplier' | 'dropshipper';
type Status = 'pending' | 'approved' | 'rejected';

interface Row {
  key: string;
  kind: Kind;
  userId: string;
  name: string;
  place: string | null;
  card: string;
  reg: string | null;
  front: string;
  back: string | null;
  doc: string | null;
  selfie: string | null;
  status: Status;
  reason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

interface SupplierRow {
  supplier_id: string; ghana_card_number: string; business_reg_number: string | null;
  ghana_card_front_path: string; ghana_card_back_path: string | null; business_doc_path: string | null;
  selfie_path: string | null; status: Status; rejection_reason: string | null; submitted_at: string; reviewed_at: string | null;
  supplier_profiles: { business_name: string; region: string | null } | null;
}
interface DropshipperRow {
  dropshipper_id: string; ghana_card_number: string; ghana_card_front_path: string; ghana_card_back_path: string | null;
  selfie_path: string; status: Status; rejection_reason: string | null; submitted_at: string; reviewed_at: string | null;
  dropshipper_profiles: { store_name: string | null; business_name: string } | null;
}

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Admin queue for supplier and dropshipper identity checks. Documents open through short-lived signed links. */
export const VerificationsPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Status>('pending');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sup, drop] = await Promise.all([
      supabase.from('supplier_verifications').select('*, supplier_profiles(business_name, region)').order('submitted_at', { ascending: false }).limit(200),
      supabase.from('dropshipper_verifications').select('*, dropshipper_profiles(store_name, business_name)').order('submitted_at', { ascending: false }).limit(200),
    ]);
    // The dropshipper table only exists after supabase/onboarding.sql; suppliers alone still work without it.
    if (sup.error) {
      setError('Could not load verifications. Apply supabase/launch-features.sql, then supabase/onboarding.sql.');
      setLoading(false);
      return;
    }
    const mapped: Row[] = [
      ...((sup.data ?? []) as unknown as SupplierRow[]).map((r): Row => ({
        key: `s-${r.supplier_id}`, kind: 'supplier', userId: r.supplier_id,
        name: r.supplier_profiles?.business_name || 'Supplier', place: r.supplier_profiles?.region ?? null,
        card: r.ghana_card_number, reg: r.business_reg_number, front: r.ghana_card_front_path, back: r.ghana_card_back_path,
        doc: r.business_doc_path, selfie: r.selfie_path, status: r.status, reason: r.rejection_reason,
        submittedAt: r.submitted_at, reviewedAt: r.reviewed_at,
      })),
      ...(drop.error ? [] : ((drop.data ?? []) as unknown as DropshipperRow[]).map((r): Row => ({
        key: `d-${r.dropshipper_id}`, kind: 'dropshipper', userId: r.dropshipper_id,
        name: r.dropshipper_profiles?.store_name || r.dropshipper_profiles?.business_name || 'Dropshipper', place: null,
        card: r.ghana_card_number, reg: null, front: r.ghana_card_front_path, back: r.ghana_card_back_path,
        doc: null, selfie: r.selfie_path, status: r.status, reason: r.rejection_reason,
        submittedAt: r.submitted_at, reviewedAt: r.reviewed_at,
      }))),
    ].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    setError('');
    setRows(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDoc = async (path: string) => {
    const { data, error: err } = await supabase.storage.from('supplier-documents').createSignedUrl(path, 300);
    if (err || !data?.signedUrl) return showToast('Could not open that document.', 'error');
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const review = async (r: Row, approve: boolean) => {
    if (!approve && !reasons[r.key]?.trim()) return showToast('Tell them what to fix first.', 'error');
    setBusy(r.key);
    const { error: err } = r.kind === 'supplier'
      ? await supabase.rpc('review_supplier_verification', { p_supplier_id: r.userId, p_approve: approve, p_reason: approve ? null : reasons[r.key] })
      : await supabase.rpc('review_dropshipper_verification', { p_dropshipper_id: r.userId, p_approve: approve, p_reason: approve ? null : reasons[r.key] });
    setBusy(null);
    if (err) return showToast(err.message, 'error');
    showToast(approve ? 'Approved. Their dashboard is now open.' : 'Sent back with your note.', 'success');
    await load();
    onChanged?.();
  };

  const visible = rows.filter((r) => r.status === filter);
  const count = (s: Status) => rows.filter((r) => r.status === s).length;

  return (
    <section className="bg-white rounded border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <BadgeCheck size={16} className="text-[#f04438]" />
          <h2 className="text-[15px] font-black text-[#151515]">Identity verification</h2>
        </div>
        <div className="flex gap-1.5">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={`h-8 rounded px-3 text-[11px] font-black capitalize transition-colors ${filter === s ? 'bg-[#151515] text-white' : 'bg-gray-100 text-[#555] hover:bg-gray-200'}`}>
              {s} <span className="opacity-60">{count(s)}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#999]">Compare the face on the selfie with the photo on the Ghana Card, and check the number is typed correctly. Document links expire after 5 minutes.</p>
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
            <li key={r.key} className="p-4 space-y-3">
              <div>
                <p className="text-[14px] font-black text-[#151515]">
                  {r.name} <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-black capitalize text-[#555]">{r.kind}</span>
                </p>
                <p className="text-[11px] text-[#999]">{r.place ? `${r.place} · ` : ''}submitted {date(r.submittedAt)}</p>
              </div>
              <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
                <div><dt className="text-[10px] font-black uppercase tracking-wider text-[#999]">Ghana Card number</dt><dd className="font-mono font-bold text-[#151515]">{r.card}</dd></div>
                {r.kind === 'supplier' && (
                  <div><dt className="text-[10px] font-black uppercase tracking-wider text-[#999]">Business registration</dt><dd className="font-bold text-[#151515]">{r.reg || '—'}</dd></div>
                )}
              </dl>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Card (front)', path: r.front },
                  { label: 'Card (back)', path: r.back },
                  { label: 'Selfie', path: r.selfie },
                  { label: 'Business document', path: r.doc },
                ].filter((d) => d.path).map((d) => (
                  <button key={d.label} type="button" onClick={() => openDoc(d.path as string)}
                    className="h-9 rounded border border-gray-200 px-3 text-[11px] font-black text-[#555] hover:border-[#151515] hover:text-[#151515] transition-colors flex items-center gap-1.5">
                    <ExternalLink size={12} /> {d.label}
                  </button>
                ))}
              </div>

              {r.status === 'pending' ? (
                <div className="space-y-2">
                  <textarea value={reasons[r.key] ?? ''} onChange={(e) => setReasons({ ...reasons, [r.key]: e.target.value })} rows={2} placeholder="If sending back: what should they fix? (shown to them)" className="w-full rounded border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-[#f04438] resize-none" />
                  <div className="flex gap-2">
                    <button type="button" disabled={busy === r.key} onClick={() => review(r, true)} className="h-9 rounded bg-[#151515] px-4 text-[12px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center gap-1.5 disabled:opacity-50"><Check size={13} /> Approve</button>
                    <button type="button" disabled={busy === r.key} onClick={() => review(r, false)} className="h-9 rounded border border-gray-200 px-4 text-[12px] font-black text-[#777] hover:border-red-300 hover:text-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"><X size={13} /> Send back</button>
                  </div>
                </div>
              ) : r.status === 'rejected' ? (
                <p className="text-[12px] text-red-700">Sent back: {r.reason}</p>
              ) : (
                <p className="text-[12px] text-emerald-700 font-semibold">Approved {r.reviewedAt ? date(r.reviewedAt) : ''}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
