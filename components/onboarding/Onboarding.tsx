'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, Clock, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useToast } from '../Toast';
import {
  checkImage,
  getMyVerification,
  isValidGhanaCard,
  submitVerification,
  type MyVerification,
  type VerifierKind,
} from '../../lib/supabase/verification';

/* ───────────────────────── Shell with step indicator ───────────────────────── */

export const OnboardingShell: React.FC<{
  steps: string[];
  current: number; // 0-based
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ steps, current, title, subtitle, children }) => {
  const { signOut, profile } = useAuth();
  return (
    <div className="apple-admin min-h-screen bg-[#f5f5f7]">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
          Localdropshipping<span className="text-[#f04438]">gh</span>
        </Link>
        <div className="flex items-center gap-4 text-[13px] text-[#6e6e73]">
          {profile?.email && <span className="hidden sm:inline">{profile.email}</span>}
          <button type="button" onClick={() => signOut()} className="font-medium text-[#d92d20] hover:underline">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] px-5 pb-16 pt-4">
        <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
          {steps.map((label, i) => {
            const done = i < current;
            const on = i === current;
            return (
              <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={on ? 'step' : undefined}>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${
                    done ? 'bg-[#1d1d1f] text-white' : on ? 'bg-[#d92d20] text-white' : 'bg-[#e5e5ea] text-[#6e6e73]'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} /> : i + 1}
                </span>
                <span className={`truncate text-[13px] ${on ? 'font-semibold text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>{label}</span>
                {i < steps.length - 1 && <span className="h-px flex-1 bg-[#d2d2d7]" />}
              </li>
            );
          })}
        </ol>

        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#1d1d1f]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">{subtitle}</p>}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06)] sm:p-6">{children}</div>
      </main>
    </div>
  );
};

/* ───────────────────────── Verification status hook ───────────────────────── */

export function useMyVerification(kind: VerifierKind) {
  const { profile } = useAuth();
  const [value, setValue] = useState<MyVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const reload = useCallback(async () => {
    if (!profile) return;
    try {
      setValue(await getMyVerification(profile.id, kind));
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [profile, kind]);

  useEffect(() => { void reload(); }, [reload]);

  return { verification: value, loading, unavailable, reload };
}

/* ───────────────────────── Form fields ───────────────────────── */

const inputClass =
  'h-11 w-full rounded-lg border border-[#d2d2d7] bg-white px-3 text-[15px] text-[#1d1d1f] placeholder:text-[#8e8e93] focus:border-[#d92d20] focus:outline-none';
const labelClass = 'mb-1 block text-[13px] font-medium text-[#1d1d1f]';

export const Field: React.FC<{ label: string; hint?: string; htmlFor: string; children: React.ReactNode }> = ({ label, hint, htmlFor, children }) => (
  <div>
    <label className={labelClass} htmlFor={htmlFor}>{label}</label>
    {children}
    {hint && <p className="mt-1 text-[12px] text-[#6e6e73]">{hint}</p>}
  </div>
);
export const textInput = inputClass;

const PhotoField: React.FC<{
  id: string;
  label: string;
  hint: string;
  required?: boolean;
  camera?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
}> = ({ id, label, hint, required, camera, file, onChange }) => {
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <p className={labelClass}>{label}{required ? '' : ' (optional)'}</p>
      <label
        htmlFor={id}
        className="flex min-h-[72px] cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#c7c7cc] bg-[#fafafa] px-3 py-2 text-[14px] text-[#3a3a3c] hover:border-[#d92d20]"
      >
        {preview ? (
          <img src={preview} alt="" className="h-14 w-14 rounded-md object-cover" />
        ) : camera ? (
          <Camera size={20} className="text-[#6e6e73]" />
        ) : (
          <Upload size={20} className="text-[#6e6e73]" />
        )}
        <span className="min-w-0 flex-1 truncate">{file ? file.name : hint}</span>
        <span className="text-[13px] font-medium text-[#d92d20]">{file ? 'Change' : camera ? 'Take photo' : 'Choose'}</span>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          {...(camera ? { capture: 'user' as const } : {})}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            const problem = f ? checkImage(f) : null;
            setError(problem ?? '');
            onChange(problem ? null : f);
          }}
        />
      </label>
      {error && <p role="alert" className="mt-1 text-[12px] font-medium text-[#d92d20]">{error}</p>}
    </div>
  );
};

/* ───────────────────────── Step: identity ───────────────────────── */

export const IdentityStep: React.FC<{
  kind: VerifierKind;
  rejected?: MyVerification | null;
  onSubmitted: () => void;
}> = ({ kind, rejected, onSubmitted }) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [card, setCard] = useState('');
  const [reg, setReg] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!profile) return;
    if (!isValidGhanaCard(card)) return setError('Enter your Ghana Card number like GHA-123456789-0.');
    if (!front) return setError('Add a clear photo of the front of your Ghana Card.');
    if (!selfie) return setError('Take a selfie so we can match you to your Ghana Card.');
    if (!consent) return setError('Please confirm you agree to us checking these details.');
    setSubmitting(true);
    try {
      await submitVerification({
        kind, userId: profile.id, ghanaCardNumber: card, businessRegNumber: reg,
        front, back, selfie, businessDoc: doc,
      });
      showToast('Sent for review.', 'success');
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {rejected?.status === 'rejected' && (
        <div role="alert" className="rounded-lg bg-[#fff1f0] px-4 py-3 text-[14px] text-[#912018]">
          <strong>We couldn&apos;t verify you yet.</strong> {rejected.rejectionReason} Please fix this and send it again.
        </div>
      )}

      <Field label="Ghana Card number" htmlFor="o-card" hint="Printed on the front, like GHA-123456789-0.">
        <input id="o-card" required value={card} onChange={(e) => setCard(e.target.value)} placeholder="GHA-123456789-0" autoComplete="off" className={`${inputClass} uppercase`} />
      </Field>

      <PhotoField id="o-front" label="Ghana Card, front" hint="Clear photo, all four corners visible" required file={front} onChange={setFront} />
      <PhotoField id="o-back" label="Ghana Card, back" hint="Photo of the back" file={back} onChange={setBack} />
      <PhotoField id="o-selfie" label="Selfie" hint="Face the camera in good light, no hat or glasses" required camera file={selfie} onChange={setSelfie} />

      {kind === 'supplier' && (
        <>
          <Field label="Business registration number" htmlFor="o-reg" hint="Optional. Leave blank if you trade as an individual.">
            <input id="o-reg" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="e.g. BN-12345678" className={inputClass} />
          </Field>
          <div>
            <p className={labelClass}>Business certificate or licence (optional)</p>
            <label htmlFor="o-doc" className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#c7c7cc] bg-[#fafafa] px-3 text-[14px] text-[#3a3a3c] hover:border-[#d92d20]">
              <Upload size={18} className="text-[#6e6e73]" />
              <span className="min-w-0 flex-1 truncate">{doc ? doc.name : 'Registration certificate, FDA or other permit (PDF or photo)'}</span>
              <input id="o-doc" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </>
      )}

      <label className="flex items-start gap-2.5 text-[13px] leading-snug text-[#3a3a3c]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#d92d20]" />
        <span>
          I agree to Localdropshippinggh checking these details. They are stored privately, seen only by our verification team, and used only to confirm who I am. See the{' '}
          <Link href="/privacy" className="font-medium text-[#d92d20] hover:underline">privacy policy</Link>.
        </span>
      </label>

      {error && <p role="alert" className="rounded-lg bg-[#fff1f0] px-3 py-2.5 text-[13px] text-[#912018]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d92d20] text-[15px] font-semibold text-white transition-colors hover:bg-[#b42318] disabled:opacity-60"
      >
        {submitting ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><ShieldCheck size={16} /> Send for review</>}
      </button>
    </form>
  );
};

/* ───────────────────────── Step: under review ───────────────────────── */

export const ReviewStep: React.FC<{
  verification: MyVerification;
  who: string;
  reload: () => Promise<void>;
  onApproved: () => void;
}> = ({ verification, who, reload, onApproved }) => {
  const [checking, setChecking] = useState(false);

  // Check quietly every 30 seconds so the page opens itself once an admin approves.
  useEffect(() => {
    const t = setInterval(() => { void reload(); }, 30000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    if (verification.status === 'approved') onApproved();
  }, [verification.status, onApproved]);

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f5f5f7] text-[#1d1d1f]">
        <Clock size={26} />
      </div>
      <div>
        <h2 className="text-[20px] font-semibold text-[#1d1d1f]">We&apos;re checking your details</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">
          Thanks, {who}. We received your documents on{' '}
          {new Date(verification.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} (Ghana Card {verification.ghanaCardNumber.slice(0, 7)}•••••).
          Most reviews finish within 2 business days, and we&apos;ll open your dashboard as soon as you&apos;re approved.
        </p>
      </div>
      <button
        type="button"
        disabled={checking}
        onClick={async () => { setChecking(true); await reload(); setChecking(false); }}
        className="h-11 rounded-xl border border-[#d2d2d7] px-6 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-60"
      >
        {checking ? 'Checking…' : 'Check status'}
      </button>
    </div>
  );
};
