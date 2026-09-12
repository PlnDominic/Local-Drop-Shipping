'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthProvider';
import { ArrowLeft, ArrowRight, CheckCircle2, ShoppingBag, TrendingUp, Truck } from 'lucide-react';

type Mode = 'signin' | 'signup';
type Role = 'customer' | 'dropshipper' | 'supplier';

const roleOptions: { id: Role; label: string; desc: string; icon: typeof ShoppingBag }[] = [
  { id: 'customer', label: 'Shop', desc: 'Buy products', icon: ShoppingBag },
  { id: 'dropshipper', label: 'Dropship', desc: 'Resell & earn', icon: TrendingUp },
  { id: 'supplier', label: 'Supply', desc: 'List wholesale', icon: Truck },
];

const GoogleIcon: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');

  const [error, setError] = useState('');
  const [info, setInfo] = useState(
    searchParams.get('msg') === 'confirm'
      ? 'Account created! Check your email to confirm, then sign in.'
      : '',
  );
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → leave the auth page.
  useEffect(() => {
  console.log('LOGIN PAGE AUTH:', {
    session,
    hasSession: !!session,
  });
}, [session]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);

    if (mode === 'signin') {
      const { error: err } = await signIn(email, password);
      setSubmitting(false);
      if (err) return setError(err);
      router.replace('/');
    } else {
      const { error: err, needsConfirmation } = await signUp({ email, password, fullName, phone, role });
      setSubmitting(false);
      if (err) return setError(err);
      if (needsConfirmation) {
        setInfo('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
        return;
      }
      router.replace('/');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);
    const { error: err } = await signInWithGoogle();
    // On success the browser redirects to Google, so we only land here on failure.
    if (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full h-11 rounded border border-gray-200 px-3 text-[13px] focus:outline-none focus:border-[#f04438]';
  const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans grid lg:grid-cols-2">
      {/* ── Brand panel ── */}
      <div className="relative hidden lg:flex flex-col justify-between bg-[#151515] text-white p-12 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#f04438]/20 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-2.5 w-fit">
          <div className="grid h-8 w-8 place-items-center bg-[#f04438] font-black text-white">LD</div>
          <span className="font-black text-lg tracking-tight">Local Drop Shipping <span className="text-[#f04438]">GH</span></span>
        </Link>

        <div className="relative space-y-5">
          <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest">Ghana&apos;s dropshipping platform</p>
          <h1 className="text-4xl font-black leading-tight">Sell more.<br />Stock less.<br />Grow faster.</h1>
          <p className="text-gray-400 text-[13px] max-w-sm">
            Connect with verified local suppliers, import products in seconds, and get paid via MTN MoMo.
          </p>
        </div>

        <Link href="/" className="relative flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-white transition-colors w-fit">
          <ArrowLeft size={14} /> Back to marketplace
        </Link>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="grid h-8 w-8 place-items-center bg-[#151515] font-black text-[#f04438]">LD</div>
            <span className="font-black text-lg text-[#151515]">Local Drop Shipping <span className="text-[#f04438]">GH</span></span>
          </Link>

          <h2 className="text-[24px] font-black text-[#151515]">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-[13px] text-[#888] mt-1">
            {mode === 'signin' ? 'Sign in to your account to continue.' : 'Join thousands selling across Ghana.'}
          </p>

          {/* Mode toggle */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded bg-gray-100 p-1">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setInfo(''); }}
                className={`h-9 rounded text-[12px] font-black transition-colors ${
                  mode === m ? 'bg-white text-[#151515] shadow-sm' : 'text-[#777] hover:text-[#151515]'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="mt-5 w-full h-11 rounded border border-gray-200 bg-white text-[13px] font-bold text-[#151515] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#aaa]">or with email</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {info && (
            <div className="mt-5 flex items-start gap-2 rounded bg-[#f04438]/10 px-3 py-3 text-[12px] text-[#c0392b] border border-[#f04438]/20">
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" /> <span>{info}</span>
            </div>
          )}
          {error && (
            <div className="mt-5 rounded bg-red-50 px-3 py-3 text-[12px] text-red-700 border border-red-100">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className={labelClass}>I want to</label>
                  <div className="grid grid-cols-3 gap-2">
                    {roleOptions.map((r) => {
                      const Icon = r.icon;
                      const active = role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`flex flex-col items-center gap-1 rounded border px-2 py-3 transition-colors ${
                            active ? 'border-[#f04438] bg-[#f04438]/5' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon size={18} className={active ? 'text-[#f04438]' : 'text-[#999]'} />
                          <span className={`text-[11px] font-black ${active ? 'text-[#151515]' : 'text-[#777]'}`}>{r.label}</span>
                          <span className="text-[9px] text-[#999]">{r.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Full name</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kofi Owusu" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 ..." className={inputClass} />
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded bg-[#151515] text-[13px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              {!submitting && <ArrowRight size={15} />}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[#888]">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
              className="font-black text-[#f04438] hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
