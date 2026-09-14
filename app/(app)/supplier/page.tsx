'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Clock3, Mail, MapPin } from 'lucide-react';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useGlobalStore } from '../../../store/globalStore';
import { SupplierDashboard } from '../../../views/SupplierDashboard';
import { SupplierRegister } from '../../../views/SupplierRegister';
import { supabase } from '../../../lib/supabase/client';

const inputClass =
  'w-full h-11 rounded border border-gray-200 px-3 text-[13px] focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

/** Business-details form shared by "finish your profile" and "apply as a supplier" states. */
const SupplierProfileForm: React.FC<{ becomingSupplier: boolean }> = ({ becomingSupplier }) => {
  const { profile, refreshProfile } = useAuth();
  const submitSupplierProfile = useGlobalStore((s) => s.submitSupplierProfile);

  const [businessName, setBusinessName] = useState('');
  const [businessRegNumber, setBusinessRegNumber] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !region.trim()) {
      setError('Business name and region are required.');
      return;
    }
    setSubmitting(true);
    setError('');

    if (becomingSupplier && profile) {
      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'supplier' })
        .eq('id', profile.id);
      if (roleError) {
        setError(roleError.message);
        setSubmitting(false);
        return;
      }
    }

    const { error: profileError } = await submitSupplierProfile({
      businessName: businessName.trim(),
      businessRegNumber: businessRegNumber.trim(),
      region: region.trim(),
      description: description.trim(),
    });

    setSubmitting(false);
    if (profileError) {
      setError(profileError);
      return;
    }

    if (becomingSupplier) await refreshProfile();
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/" className="flex items-center gap-1 text-[12px] text-[#777] hover:text-[#151515]">
            Back to marketplace
          </Link>
        </div>

        <h2 className="text-[24px] font-black text-[#151515]">
          {becomingSupplier ? 'Become a Supplier' : 'Finish your business profile'}
        </h2>
        <p className="text-[13px] text-[#888] mt-1 mb-6">
          {becomingSupplier
            ? 'List wholesale products for dropshippers across Ghana. Your application will be reviewed before you can go live.'
            : 'One last step — tell us about your business before your application is reviewed.'}
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2.5 text-[12px] text-red-700 border border-red-100">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded bg-[#f04438] text-[13px] font-black text-white hover:bg-[#c0392b] transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

const PendingApproval: React.FC = () => {
  const { profile } = useAuth();
  const supplierProfile = useGlobalStore((s) => s.supplierProfile);

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[#f04438]/10 text-[#f04438]">
          <Clock3 size={26} />
        </div>
        <h2 className="text-[22px] font-black text-[#151515]">Application under review</h2>
        <p className="text-[13px] text-[#888] mt-2">
          Thanks, {profile?.fullName || 'there'}. <strong className="text-[#151515]">{supplierProfile?.businessName}</strong> is
          being reviewed by our team. We vet every supplier before their catalog goes live to dropshippers — this
          usually takes 1–2 business days.
        </p>
        <div className="mt-6 rounded border border-gray-100 bg-white p-4 text-left text-[12px] space-y-1.5">
          <p className="flex items-center gap-2 text-[#555]"><Building2 size={13} className="text-[#f04438]" /> {supplierProfile?.businessName}</p>
          <p className="flex items-center gap-2 text-[#555]"><MapPin size={13} className="text-[#f04438]" /> {supplierProfile?.region}</p>
          <p className="flex items-center gap-2 text-[#555]"><Mail size={13} className="text-[#f04438]" /> {profile?.email}</p>
        </div>
        <Link
          href="/"
          className="mt-6 inline-block h-11 rounded bg-[#151515] px-6 text-[12px] font-black leading-[44px] text-white hover:bg-[#f04438] transition-colors"
        >
          Back to marketplace
        </Link>
      </div>
    </div>
  );
};

export default function SupplierPage() {
  const { session, profile, loading } = useAuth();
  const { hydrated, supplierProfile } = useGlobalStore();

  if (loading || (session && !hydrated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session || !profile) {
    return <SupplierRegister />;
  }

  // Admins can always reach the dashboard for support/debugging.
  if (profile.role === 'admin') {
    return <SupplierDashboard />;
  }

  if (profile.role === 'supplier') {
    if (!supplierProfile) return <SupplierProfileForm becomingSupplier={false} />;
    if (!supplierProfile.isApproved) return <PendingApproval />;
    return <SupplierDashboard />;
  }

  // Signed in as a customer or dropshipper — offer to apply.
  return <SupplierProfileForm becomingSupplier />;
}
