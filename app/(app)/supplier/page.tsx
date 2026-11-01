'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useGlobalStore } from '../../../store/globalStore';
import { SupplierDashboard } from '../../../views/SupplierDashboard';
import { SupplierRegister } from '../../../views/SupplierRegister';
import { supabase } from '../../../lib/supabase/client';
import { Field, IdentityStep, OnboardingShell, ReviewStep, textInput, useMyVerification } from '../../../components/onboarding/Onboarding';

const STEPS = ['Your business', 'Verify identity', 'Review'];

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
    <OnboardingShell
      steps={STEPS}
      current={0}
      title={becomingSupplier ? 'Become a supplier' : 'Tell us about your business'}
      subtitle="List wholesale products for dropshippers across Ghana. Next we'll verify your identity, then our team approves your account before you go live."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p role="alert" className="rounded-lg bg-[#fff1f0] px-3 py-2.5 text-[13px] text-[#912018]">{error}</p>}

        <Field label="Business name" htmlFor="sb-name">
          <input id="sb-name" type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Bhra Joe Wholesale" className={textInput} />
        </Field>
        <Field label="Business registration number" htmlFor="sb-reg" hint="Optional. Leave blank if you trade as an individual.">
          <input id="sb-reg" type="text" value={businessRegNumber} onChange={(e) => setBusinessRegNumber(e.target.value)} placeholder="e.g. BN123456789" className={textInput} />
        </Field>
        <Field label="Region" htmlFor="sb-region">
          <input id="sb-region" type="text" required value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Greater Accra" className={textInput} />
        </Field>
        <Field label="What do you sell?" htmlFor="sb-desc">
          <textarea
            id="sb-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Electronics and phone accessories sourced from Kumasi wholesalers."
            className="w-full rounded-lg border border-[#d2d2d7] px-3 py-2 text-[15px] focus:border-[#d92d20] focus:outline-none"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-[#d92d20] text-[15px] font-semibold text-white transition-colors hover:bg-[#b42318] disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Continue'}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </form>
    </OnboardingShell>
  );
};

/** Steps 2 and 3 for a supplier whose account is not approved yet: identity documents, then review. */
const SupplierVerificationGate: React.FC = () => {
  const { profile } = useAuth();
  const { verification, loading, unavailable, reload } = useMyVerification('supplier');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
      </div>
    );
  }
  if (unavailable) {
    return (
      <OnboardingShell steps={STEPS} current={1} title="Verification isn't available yet">
        <p className="text-[15px] text-[#6e6e73]">We couldn&apos;t load your verification. Please try again in a few minutes.</p>
      </OnboardingShell>
    );
  }
  if (verification?.status === 'pending' || verification?.status === 'approved') {
    return (
      <OnboardingShell steps={STEPS} current={2} title="Almost there">
        <ReviewStep verification={verification} who={profile?.fullName?.split(' ')[0] || 'there'} reload={reload} onApproved={() => window.location.reload()} />
      </OnboardingShell>
    );
  }
  return (
    <OnboardingShell
      steps={STEPS}
      current={1}
      title="Verify your identity"
      subtitle="We vet every supplier before their catalog goes live to dropshippers. Add your Ghana Card and a selfie; it takes about two minutes."
    >
      <IdentityStep kind="supplier" rejected={verification} onSubmitted={() => { void reload(); }} />
    </OnboardingShell>
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
    // Whole dashboard stays closed until an admin approves their identity documents.
    if (!supplierProfile.isApproved) return <SupplierVerificationGate />;
    return <SupplierDashboard />;
  }

  // Signed in as a customer or dropshipper — offer to apply.
  return <SupplierProfileForm becomingSupplier />;
}
