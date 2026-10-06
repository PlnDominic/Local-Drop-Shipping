'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Clock, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useToast } from '../Toast';
import {
  checkDocument,
  getMyVerification,
  isValidGhanaCard,
  submitVerification,
  type MyVerification,
} from '../../lib/supabase/verification';

const inputClass = 'w-full h-11 rounded border border-gray-200 px-3 text-[13px] bg-white focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

const FileField: React.FC<{
  label: string;
  hint: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
}> = ({ label, hint, required, file, onChange }) => {
  const [error, setError] = useState('');
  return (
    <div>
      <label className={labelClass}>{label}{required ? '' : ' (optional)'}</label>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded border border-dashed border-gray-300 bg-white px-3 py-2 text-[12px] text-[#555] hover:border-[#f04438] transition-colors">
        <Upload size={14} className="text-[#f04438] flex-shrink-0" />
        <span className="truncate">{file ? file.name : hint}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            const problem = f ? checkDocument(f) : null;
            setError(problem ?? '');
            onChange(problem ? null : f);
          }}
        />
      </label>
      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
};

/** Supplier-facing verification: submit Ghana Card + documents, then follow the review. */
export const VerificationCard: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [current, setCurrent] = useState<MyVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [card, setCard] = useState('');
  const [reg, setReg] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setCurrent(await getMyVerification(profile.id));
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!profile) return;
    if (!isValidGhanaCard(card)) return setError('Enter your Ghana Card number like GHA-123456789-0.');
    if (!front) return setError('Please add a clear photo of the front of your Ghana Card.');
    setSubmitting(true);
    try {
      await submitVerification({ userId: profile.id, ghanaCardNumber: card, businessRegNumber: reg, front, back, businessDoc: doc });
      showToast('Submitted. We will review your documents soon.', 'success');
      setFront(null); setBack(null); setDoc(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-40 rounded bg-gray-100 animate-pulse" />;
  if (unavailable) {
    return <div className="rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">Verification isn&apos;t available yet. Please check back soon.</div>;
  }

  if (current?.status === 'approved') {
    return (
      <div className="rounded border border-emerald-200 bg-emerald-50 p-6 flex items-start gap-3">
        <BadgeCheck size={28} className="text-emerald-600 flex-shrink-0" />
        <div>
          <h2 className="text-[16px] font-black text-emerald-900">You&apos;re verified</h2>
          <p className="mt-1 text-[13px] text-emerald-800">A Verified badge now shows next to your name on your products, so dropshippers and customers know who they are buying from.</p>
        </div>
      </div>
    );
  }

  if (current?.status === 'pending') {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-6 flex items-start gap-3">
        <Clock size={28} className="text-yellow-600 flex-shrink-0" />
        <div>
          <h2 className="text-[16px] font-black text-[#5c4a00]">Under review</h2>
          <p className="mt-1 text-[13px] text-[#5c4a00]">
            We received your documents on {new Date(current.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} (Ghana Card {current.ghanaCardNumber.slice(0, 7)}•••••).
            We usually respond within 2 business days. You can keep selling while we check.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded border border-gray-100 bg-white p-6 space-y-5">
      <div className="flex items-start gap-3">
        <ShieldCheck size={26} className="text-[#f04438] flex-shrink-0" />
        <div>
          <h2 className="text-[18px] font-black text-[#151515]">Get the Verified badge</h2>
          <p className="mt-1 text-[13px] text-[#666]">
            Verified suppliers earn trust and sell more. Send your Ghana Card and, if you have one, your business registration. Only our verification team can see them; they&apos;re stored privately and used only to check who you are. See our <a href="/privacy" className="font-bold text-[#f04438] hover:underline">privacy policy</a>.
          </p>
        </div>
      </div>

      {current?.status === 'rejected' && (
        <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-800">
          <strong>We couldn&apos;t verify you yet.</strong> {current.rejectionReason} Please fix this and send your documents again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="v-card">Ghana Card number</label>
          <input id="v-card" required value={card} onChange={(e) => setCard(e.target.value)} placeholder="GHA-123456789-0" autoComplete="off" className={`${inputClass} uppercase`} />
        </div>
        <div>
          <label className={labelClass} htmlFor="v-reg">Business registration no. (optional)</label>
          <input id="v-reg" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="e.g. BN-12345678" className={inputClass} />
        </div>
        <FileField label="Ghana Card, front" hint="Choose a clear photo (JPG, PNG or PDF, max 5 MB)" required file={front} onChange={setFront} />
        <FileField label="Ghana Card, back" hint="Choose a photo" file={back} onChange={setBack} />
        <FileField label="Business certificate or licence" hint="Registration certificate, FDA/other permit" file={doc} onChange={setDoc} />
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2.5 text-[12px] text-red-700 border border-red-100">{error}</div>}

      <button type="submit" disabled={submitting} className="h-11 rounded bg-[#f04438] px-6 text-[13px] font-black text-white hover:bg-[#c0392b] transition-colors disabled:opacity-60">
        {submitting ? 'Uploading…' : current?.status === 'rejected' ? 'Send again' : 'Submit for verification'}
      </button>
    </form>
  );
};
