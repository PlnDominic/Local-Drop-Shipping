'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Truck,
  User,
} from 'lucide-react';
import { supabase } from '../lib/supabase/client';

type Step = 'personal' | 'business' | 'review';

const inputClass =
  'w-full h-11 rounded border border-gray-200 px-3 text-[13px] focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

export const SupplierRegister: React.FC = () => {
  const router = useRouter();

  const [step, setStep] = useState<Step>('personal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Personal info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Business info
  const [businessName, setBusinessName] = useState('');
  const [businessRegNumber, setBusinessRegNumber] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');

  const validatePersonal = () => {
    if (!fullName.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!phone.trim()) return 'Phone number is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const validateBusiness = () => {
    if (!businessName.trim()) return 'Business name is required.';
    if (!region.trim()) return 'Region is required.';
    return '';
  };

  const goToBusinessStep = () => {
    const err = validatePersonal();
    if (err) { setError(err); return; }
    setError('');
    setStep('business');
  };

  const goToReview = () => {
    const err = validateBusiness();
    if (err) { setError(err); return; }
    setError('');
    setStep('review');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    // 1. Create the auth account directly (rather than the AuthProvider wrapper)
    //    so we have the new user's id available for the supplier_profiles insert.
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Consumed by the public.handle_new_user() trigger to populate the profile row.
        data: { full_name: fullName, phone, role: 'supplier' },
      },
    });

    if (signUpErr) {
      setError(signUpErr.message);
      setSubmitting(false);
      return;
    }

    const needsConfirmation = !!data.user && !data.session;

    // 2. Create the supplier's business profile. This only succeeds under RLS
    //    when a session already exists (email confirmation disabled) — with
    //    confirmation required, the user completes this step on first login,
    //    from the "Finish your business profile" screen on /supplier.
    if (data.user && data.session) {
      await supabase.from('supplier_profiles').upsert({
        id: data.user.id,
        business_name: businessName.trim(),
        business_reg_number: businessRegNumber.trim(),
        region: region.trim(),
        description: description.trim(),
      });
    }

    setSubmitting(false);

    if (needsConfirmation) {
      router.push('/login?msg=confirm');
    } else {
      router.push('/supplier');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between text-white p-12 overflow-hidden bg-[#151515]">
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/80 to-[#f04438]/50" />
        <Link href="/" className="relative flex items-center gap-2.5 w-fit">
          <div className="grid h-8 w-8 place-items-center bg-[#f04438] font-black text-white">LD</div>
          <span className="font-black text-lg tracking-tight">
            Local Drop Shipping <span className="text-[#f04438]">GH</span>
          </span>
        </Link>

        <div className="relative space-y-5">
          <div className="flex items-center gap-2 text-[#f04438]">
            <Truck size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest">Become a Supplier</span>
          </div>
          <h1 className="text-4xl font-black leading-tight">
            List wholesale.<br />Reach dropshippers.<br />Ship nationwide.
          </h1>
          <p className="text-gray-400 text-[13px] max-w-sm">
            Publish your catalog to verified Ghanaian dropshippers, set your own wholesale prices, and fulfill
            orders via GhanaPost GPS. Every new supplier is reviewed before going live to keep the marketplace trustworthy.
          </p>
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
            {(['personal', 'business', 'review'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 text-[11px] font-black ${step === s ? 'text-[#f04438]' : i < ['personal', 'business', 'review'].indexOf(step) ? 'text-green-600' : 'text-[#bbb]'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === s ? 'bg-[#f04438] text-white' : i < ['personal', 'business', 'review'].indexOf(step) ? 'bg-green-600 text-white' : 'bg-gray-200 text-[#999]'}`}>
                    {i < ['personal', 'business', 'review'].indexOf(step) ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:block">{s === 'personal' ? 'Personal Info' : s === 'business' ? 'Business Info' : 'Review'}</span>
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
              <p className="text-[13px] text-[#888] mt-1 mb-6">List wholesale products for dropshippers across Ghana.</p>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}><User size={10} className="inline mr-1" />Full Name</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ama Boateng" className={inputClass} />
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
                  onClick={goToBusinessStep}
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

          {/* ── Step 2: Business Info ── */}
          {step === 'business' && (
            <>
              <button type="button" onClick={() => setStep('personal')} className="flex items-center gap-1 text-[12px] text-[#777] hover:text-[#151515] mb-4">
                <ArrowLeft size={13} /> Back
              </button>
              <h2 className="text-[24px] font-black text-[#151515]">Your business</h2>
              <p className="text-[13px] text-[#888] mt-1 mb-6">
                This is what dropshippers and our review team will see. You can edit it later.
              </p>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}><Building2 size={10} className="inline mr-1" />Business Name</label>
                  <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Bhra Joe Wholesale" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><Building2 size={10} className="inline mr-1" />Business Registration Number</label>
                  <input type="text" value={businessRegNumber} onChange={(e) => setBusinessRegNumber(e.target.value)} placeholder="e.g. BN123456789 (optional)" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}><MapPin size={10} className="inline mr-1" />Region</label>
                  <input type="text" required value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Greater Accra" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>What do you sell?</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Electronics and phone accessories sourced from Kumasi wholesalers."
                    className="w-full rounded border border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-[#f04438]"
                  />
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
              <button type="button" onClick={() => setStep('business')} className="flex items-center gap-1 text-[12px] text-[#777] hover:text-[#151515] mb-4">
                <ArrowLeft size={13} /> Back
              </button>
              <h2 className="text-[24px] font-black text-[#151515]">Review & Submit</h2>
              <p className="text-[13px] text-[#888] mt-1 mb-6">Confirm your details before applying.</p>

              <div className="space-y-3 mb-6">
                <div className="rounded border border-gray-100 bg-white p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#999]">Personal Info</p>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div><span className="text-[#999]">Name</span><p className="font-bold text-[#151515]">{fullName}</p></div>
                    <div><span className="text-[#999]">Email</span><p className="font-bold text-[#151515] truncate">{email}</p></div>
                    <div><span className="text-[#999]">Phone</span><p className="font-bold text-[#151515]">{phone}</p></div>
                    <div><span className="text-[#999]">Role</span><p className="font-bold text-[#f04438]">Supplier</p></div>
                  </div>
                </div>

                <div className="rounded border border-gray-100 bg-white p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#999]">Business Info</p>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div><span className="text-[#999]">Business name</span><p className="font-bold text-[#151515]">{businessName}</p></div>
                    <div><span className="text-[#999]">Reg. number</span><p className="font-bold text-[#151515]">{businessRegNumber || '—'}</p></div>
                    <div><span className="text-[#999]">Region</span><p className="font-bold text-[#151515]">{region}</p></div>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-[#f04438]/5 border border-[#f04438]/20 rounded p-3">
                  <CheckCircle2 size={14} className="text-[#f04438] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[#555]">
                    Your application will be reviewed by our team before your catalog goes live to dropshippers.
                    We'll notify you once approved.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-11 rounded bg-[#f04438] text-[13px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {submitting ? 'Submitting application…' : 'Submit Application'}
                {!submitting && <ArrowRight size={15} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
