'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Upload,
  X,
  User,
  Phone,
  Mail,
  Lock,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../lib/auth/AuthProvider';
import { supabase } from '../lib/supabase/client';

type Step = 'personal' | 'ghana-card' | 'review';

const inputClass =
  'w-full h-11 rounded border border-gray-200 px-3 text-[13px] focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

export const DropshipperRegister: React.FC = () => {
  const router = useRouter();
  const { signUp } = useAuth();

  const [step, setStep] = useState<Step>('personal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Personal info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Ghana Card
  const [ghanaCardFront, setGhanaCardFront] = useState<File | null>(null);
  const [ghanaCardBack, setGhanaCardBack] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const handleFile = (
    file: File | undefined,
    setSide: (f: File) => void,
    setPreview: (s: string) => void,
  ) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    setSide(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  };

  const validatePersonal = () => {
    if (!fullName.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!phone.trim()) return 'Phone number is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const goToCardStep = () => {
    const err = validatePersonal();
    if (err) { setError(err); return; }
    setError('');
    setStep('ghana-card');
  };

  const goToReview = () => {
    if (!ghanaCardFront) { setError('Please upload the front of your Ghana Card.'); return; }
    if (!ghanaCardBack) { setError('Please upload the back of your Ghana Card.'); return; }
    setError('');
    setStep('review');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    // 1. Create auth account
    const { error: signUpErr, needsConfirmation } = await signUp({
      email,
      password,
      fullName,
      phone,
      role: 'dropshipper',
    });

    if (signUpErr) { setError(signUpErr); setSubmitting(false); return; }

    // 2. Upload Ghana Card images (best-effort; don't block registration)
    if (ghanaCardFront && ghanaCardBack) {
      const slug = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = Date.now();
      await Promise.all([
        supabase.storage
          .from('ghana-cards')
          .upload(`${slug}/front_${timestamp}.${ghanaCardFront.name.split('.').pop()}`, ghanaCardFront, { upsert: true }),
        supabase.storage
          .from('ghana-cards')
          .upload(`${slug}/back_${timestamp}.${ghanaCardBack.name.split('.').pop()}`, ghanaCardBack, { upsert: true }),
      ]);
    }

    setSubmitting(false);

    if (needsConfirmation) {
      router.push('/login?msg=confirm');
    } else {
      router.push('/dropshipper');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans grid lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between text-white p-12 overflow-hidden"
        style={{ backgroundImage: "url('/dropshipper-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center top' }}
      >
        {/* Black + red gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/70 to-[#f04438]/60" />
        <Link href="/" className="relative flex items-center gap-2.5 w-fit">
          <div className="grid h-8 w-8 place-items-center bg-[#f04438] font-black text-white">LD</div>
          <span className="font-black text-lg tracking-tight">
            Local Drop Shipping <span className="text-[#f04438]">GH</span>
          </span>
        </Link>

        <div className="relative space-y-5">
          <div className="flex items-center gap-2 text-[#f04438]">
            <TrendingUp size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest">Become a Dropshipper</span>
          </div>
          <h1 className="text-4xl font-black leading-tight">
            Sell more.<br />Stock less.<br />Grow faster.
          </h1>
          <p className="text-gray-400 text-[13px] max-w-sm">
            Source products from verified Ghanaian suppliers, set your own prices, and get paid via MTN MoMo.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md pt-4 border-t border-white/10">
            <div><p className="text-2xl font-black">1,200+</p><p className="text-[10px] text-gray-400">Suppliers</p></div>
            <div><p className="text-2xl font-black">₵4.5M+</p><p className="text-[10px] text-gray-400">Paid out</p></div>
            <div><p className="text-2xl font-black">99.2%</p><p className="text-[10px] text-gray-400">Delivery</p></div>
          </div>
        </div>

        <Link href="/" className="relative flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-white transition-colors w-fit">
          <ArrowLeft size={14} /> Back to marketplace
        </Link>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="grid h-8 w-8 place-items-center bg-[#151515] font-black text-[#f04438]">LD</div>
            <span className="font-black text-lg text-[#151515]">
              Local Drop Shipping <span className="text-[#f04438]">GH</span>
            </span>
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {(['personal', 'ghana-card', 'review'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 text-[11px] font-black ${step === s ? 'text-[#f04438]' : i < ['personal','ghana-card','review'].indexOf(step) ? 'text-green-600' : 'text-[#bbb]'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === s ? 'bg-[#f04438] text-white' : i < ['personal','ghana-card','review'].indexOf(step) ? 'bg-green-600 text-white' : 'bg-gray-200 text-[#999]'}`}>
                    {i < ['personal','ghana-card','review'].indexOf(step) ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:block">{s === 'personal' ? 'Personal Info' : s === 'ghana-card' ? 'Ghana Card' : 'Review'}</span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
              </React.Fragment>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded bg-red-50 px-3 py-3 text-[12px] text-red-700 border border-red-100">{error}</div>
          )}

          {/* ── Step 1: Personal Info ── */}
          {step === 'personal' && (
            <>
              <h2 className="text-[24px] font-black text-[#151515]">Create your account</h2>
              <p className="text-[13px] text-[#888] mt-1 mb-6">Join thousands of dropshippers across Ghana.</p>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}><User size={10} className="inline mr-1" />Full Name</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kofi Owusu" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><Mail size={10} className="inline mr-1" />Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><Phone size={10} className="inline mr-1" />Phone Number</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 XX XXX XXXX" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><Lock size={10} className="inline mr-1" />Password</label>
                  <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><Lock size={10} className="inline mr-1" />Confirm Password</label>
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className={inputClass} />
                </div>

                <button
                  type="button"
                  onClick={goToCardStep}
                  className="w-full h-11 rounded bg-[#151515] text-[13px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5"
                >
                  Continue <ArrowRight size={15} />
                </button>
              </div>

              <p className="mt-6 text-center text-[12px] text-[#888]">
                Already have an account?{' '}
                <Link href="/login" className="font-black text-[#f04438] hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── Step 2: Ghana Card ── */}
          {step === 'ghana-card' && (
            <>
              <button type="button" onClick={() => setStep('personal')} className="flex items-center gap-1 text-[12px] text-[#777] hover:text-[#151515] mb-4">
                <ArrowLeft size={13} /> Back
              </button>
              <h2 className="text-[24px] font-black text-[#151515]">Upload Ghana Card</h2>
              <p className="text-[13px] text-[#888] mt-1 mb-6">
                We need both sides of your Ghana Card to verify your identity. Images must be clear and under 5 MB each.
              </p>

              <div className="space-y-5">
                {/* Front */}
                <div>
                  <label className={labelClass}><CreditCard size={10} className="inline mr-1" />Front Side</label>
                  <div
                    onClick={() => frontRef.current?.click()}
                    className={`relative cursor-pointer rounded border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 h-36 ${ghanaCardFront ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-[#f04438]'}`}
                  >
                    {frontPreview ? (
                      <>
                        <img src={frontPreview} alt="Front" className="h-full w-full object-cover rounded" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setGhanaCardFront(null); setFrontPreview(''); }}
                          className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="text-[#bbb]" />
                        <p className="text-[11px] text-[#999]">Click to upload front of Ghana Card</p>
                        <p className="text-[10px] text-[#bbb]">JPG, PNG, WEBP — max 5 MB</p>
                      </>
                    )}
                  </div>
                  <input ref={frontRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0], setGhanaCardFront, setFrontPreview)} />
                </div>

                {/* Back */}
                <div>
                  <label className={labelClass}><CreditCard size={10} className="inline mr-1" />Back Side</label>
                  <div
                    onClick={() => backRef.current?.click()}
                    className={`relative cursor-pointer rounded border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 h-36 ${ghanaCardBack ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-[#f04438]'}`}
                  >
                    {backPreview ? (
                      <>
                        <img src={backPreview} alt="Back" className="h-full w-full object-cover rounded" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setGhanaCardBack(null); setBackPreview(''); }}
                          className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="text-[#bbb]" />
                        <p className="text-[11px] text-[#999]">Click to upload back of Ghana Card</p>
                        <p className="text-[10px] text-[#bbb]">JPG, PNG, WEBP — max 5 MB</p>
                      </>
                    )}
                  </div>
                  <input ref={backRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0], setGhanaCardBack, setBackPreview)} />
                </div>

                <button
                  type="button"
                  onClick={goToReview}
                  className="w-full h-11 rounded bg-[#151515] text-[13px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5"
                >
                  Review & Submit <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Review ── */}
          {step === 'review' && (
            <>
              <button type="button" onClick={() => setStep('ghana-card')} className="flex items-center gap-1 text-[12px] text-[#777] hover:text-[#151515] mb-4">
                <ArrowLeft size={13} /> Back
              </button>
              <h2 className="text-[24px] font-black text-[#151515]">Review & Submit</h2>
              <p className="text-[13px] text-[#888] mt-1 mb-6">Confirm your details before creating your account.</p>

              <div className="space-y-3 mb-6">
                <div className="rounded border border-gray-100 bg-white p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#999]">Personal Info</p>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div><span className="text-[#999]">Name</span><p className="font-bold text-[#151515]">{fullName}</p></div>
                    <div><span className="text-[#999]">Email</span><p className="font-bold text-[#151515] truncate">{email}</p></div>
                    <div><span className="text-[#999]">Phone</span><p className="font-bold text-[#151515]">{phone}</p></div>
                    <div><span className="text-[#999]">Role</span><p className="font-bold text-[#f04438]">Dropshipper</p></div>
                  </div>
                </div>

                <div className="rounded border border-gray-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#999] mb-3">Ghana Card</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-[#999] mb-1">Front</p>
                      {frontPreview && <img src={frontPreview} alt="Front" className="rounded border border-gray-100 h-20 w-full object-cover" />}
                    </div>
                    <div>
                      <p className="text-[10px] text-[#999] mb-1">Back</p>
                      {backPreview && <img src={backPreview} alt="Back" className="rounded border border-gray-100 h-20 w-full object-cover" />}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-[#f04438]/5 border border-[#f04438]/20 rounded p-3">
                  <CheckCircle2 size={14} className="text-[#f04438] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[#555]">
                    By submitting, you confirm that the information provided is accurate and the Ghana Card uploaded belongs to you.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-11 rounded bg-[#f04438] text-[13px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {submitting ? 'Creating account…' : 'Create Dropshipper Account'}
                {!submitting && <ArrowRight size={15} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
