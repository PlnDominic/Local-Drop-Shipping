'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthProvider';

const inputClass =
  'w-full h-11 rounded border border-gray-200 px-3 text-[13px] focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

/**
 * Landing page for the emailed password-reset link. The Supabase client
 * (detectSessionInUrl) turns the link into a short-lived session; with one
 * present we let the user choose a new password, otherwise the link is
 * invalid or expired.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { session, loading, updatePassword, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');

    setSubmitting(true);
    const { error: err } = await updatePassword(password);
    if (err) {
      setSubmitting(false);
      return setError(err);
    }
    // End the recovery session so they sign in fresh with the new password.
    await signOut();
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

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
          </div>
        ) : !session ? (
          <div className="space-y-4">
            <h1 className="text-[24px] font-black text-[#151515]">This link isn&apos;t valid</h1>
            <p className="text-[13px] text-[#888]">
              The password reset link has expired or was already used. Request a new one from the sign-in page.
            </p>
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-1.5 rounded bg-[#151515] px-6 text-[13px] font-black text-white hover:bg-[#f04438] transition-colors"
            >
              Back to sign in <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-black text-[#151515]">Choose a new password</h1>
            <p className="text-[13px] text-[#888] mt-1">
              For {session.user.email}. You&apos;ll sign in with it right after.
            </p>

            {error && (
              <div className="mt-5 rounded bg-red-50 px-3 py-3 text-[12px] text-red-700 border border-red-100">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className={labelClass} htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
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
