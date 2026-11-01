'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthProvider';

const inputClass =
  'w-full h-11 rounded border border-gray-200 px-3 pr-11 text-[13px] focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

/** 0 to 4: length and character variety only. A hint for the person, not a gate. */
function strength(pw: string): number {
  let n = 0;
  if (pw.length >= 8) n++;
  if (pw.length >= 12) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]|[A-Za-z]/.test(pw)) n++;
  return n;
}
const STRENGTH_LABEL = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];

/**
 * Landing page for the emailed password-reset link. Two link shapes work:
 *  - `?token_hash=…` (our email template): the token is only spent when the person presses
 *    "Update password", so mail scanners that pre-open links cannot use it up.
 *  - the default Supabase link, which arrives as a short-lived recovery session in the URL.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { session, loading, updatePassword, verifyRecovery, signOut } = useAuth();

  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [checkedUrl, setCheckedUrl] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token_hash');
    setTokenHash(t && /^[\w-]{10,200}$/.test(t) ? t : null);
    setCheckedUrl(true);
  }, []);

  const ready = checkedUrl && !loading;
  const canReset = !expired && (!!tokenHash || !!session);
  const score = strength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');

    setSubmitting(true);
    if (tokenHash) {
      const { error: vErr } = await verifyRecovery(tokenHash);
      if (vErr) {
        setSubmitting(false);
        setExpired(true);
        return;
      }
    }
    const { error: err } = await updatePassword(password);
    if (err) {
      setSubmitting(false);
      return setError(err);
    }
    // End every session, including other devices, so the new password is what counts.
    await signOut({ everywhere: true });
    router.replace('/login?msg=reset');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2.5 mb-8 w-fit">
          <div className="grid h-8 w-8 place-items-center bg-[#151515] font-black text-[#f04438]">LD</div>
          <span className="font-black text-lg text-[#151515]">
            Local Drop Shipping <span className="text-[#f04438]">GH</span>
          </span>
        </Link>

        {!ready ? (
          <div className="flex justify-center py-10" role="status" aria-label="Checking your reset link">
            <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
          </div>
        ) : !canReset ? (
          <div className="space-y-4">
            <h1 className="text-[24px] font-black text-[#151515]">This link isn&apos;t valid</h1>
            <p className="text-[13px] text-[#888]">
              The password reset link has expired or was already used. Request a new one and use the newest email.
            </p>
            <Link
              href="/login?mode=forgot"
              className="inline-flex h-11 items-center gap-1.5 rounded bg-[#151515] px-6 text-[13px] font-black text-white hover:bg-[#f04438] transition-colors"
            >
              Send a new link <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-black text-[#151515]">Choose a new password</h1>
            <p className="text-[13px] text-[#888] mt-1">
              {session?.user.email ? `For ${session.user.email}. ` : ''}You&apos;ll sign in with it right after.
            </p>

            {error && (
              <div role="alert" className="mt-5 rounded bg-red-50 px-3 py-3 text-[12px] text-red-700 border border-red-100">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className={labelClass} htmlFor="new-password">New password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[#777] hover:text-[#151515]"
                    aria-label={show ? 'Hide passwords' : 'Show passwords'}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2" aria-live="polite">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={`h-1 flex-1 rounded ${i <= score ? 'bg-[#151515]' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-[#777]">{STRENGTH_LABEL[score]}</p>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass} htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat the password"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded bg-[#f04438] text-[13px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <KeyRound size={15} />
                {submitting ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
