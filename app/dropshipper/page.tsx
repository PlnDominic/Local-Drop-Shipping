'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useGlobalStore } from '../../store/globalStore';
import { DropshipperDashboard } from '../../views/DropshipperDashboard';
import { DropshipperRegister } from '../../views/DropshipperRegister';
import { supabase } from '../../lib/supabase/client';
import { ArrowRight } from 'lucide-react';
import { Field, IdentityStep, OnboardingShell, ReviewStep, textInput, useMyVerification } from '../../components/onboarding/Onboarding';

const STEPS = ['Your store', 'Verify identity', 'Review'];

/**
 * "Set up your store" step — shown to anyone who has the dropshipper role
 * but no dropshipper_profiles row yet (a direct signup via DropshipperRegister
 * never creates one), or to a customer applying to become a dropshipper
 * (which also needs the role flipped first).
 */
const CreateStoreForm: React.FC<{ needsRoleUpdate: boolean }> = ({ needsRoleUpdate }) => {
  const { profile, refreshProfile } = useAuth();

  const [storeName, setStoreName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const estimatedSlug = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);

  const handleCreate = async () => {
    if (!profile) return;
    if (!storeName.trim()) {
      setError('Please enter a store name.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data: slug, error: slugError } = await supabase.rpc('generate_store_slug', {
        base_name: storeName.trim(),
      });
      if (slugError) throw slugError;

      if (needsRoleUpdate) {
        const { error: roleError } = await supabase
          .from('users')
          .update({ role: 'dropshipper' })
          .eq('id', profile.id);
        if (roleError) throw roleError;
      }

      const { error: profileError } = await supabase.from('dropshipper_profiles').upsert({
        id: profile.id,
        business_name: storeName.trim(),
        store_name: storeName.trim(),
        store_slug: slug,
        is_approved: true,
      });
      if (profileError) throw profileError;

      await refreshProfile();
      window.location.href = '/dropshipper';
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message + ' Make sure the schema SQL has been applied to your Supabase project.');
      setSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      steps={STEPS}
      current={0}
      title={needsRoleUpdate ? 'Become a dropshipper' : 'Set up your store'}
      subtitle={`You're signed in as ${profile?.fullName || profile?.email}. Choose a store name. We'll create your store link, then verify your identity before you start selling.`}
    >
      <div className="space-y-5">
        {error && (
          <p role="alert" className="rounded-lg bg-[#fff1f0] px-3 py-2.5 text-[13px] text-[#912018]">{error}</p>
        )}

        <Field label="Store or business name" htmlFor="store-name">
          <input
            id="store-name"
            type="text"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder={profile?.fullName || 'My Store'}
            className={textInput}
          />
        </Field>

        {storeName.trim() && estimatedSlug && (
          <div className="rounded-lg bg-[#f5f5f7] p-3">
            <p className="mb-1 text-[12px] font-medium text-[#6e6e73]">Your store link</p>
            <p className="break-all font-mono text-[13px] text-[#1d1d1f]">
              {window.location.origin}/store/{estimatedSlug}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-[#d92d20] text-[15px] font-semibold text-white transition-colors hover:bg-[#b42318] disabled:opacity-60"
        >
          {submitting ? 'Setting up store…' : 'Continue'}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </div>
    </OnboardingShell>
  );
};

/** Steps 2 and 3: identity documents, then waiting for an admin. The dashboard opens only once approved. */
const DropshipperVerificationGate: React.FC = () => {
  const { profile } = useAuth();
  const { verification, loading, unavailable, reload } = useMyVerification('dropshipper');

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
  if (verification?.status === 'approved') return <DropshipperDashboard />;

  if (verification?.status === 'pending') {
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
      subtitle="Dropshippers handle customers' orders and money, so we confirm everyone is who they say they are. It takes about two minutes."
    >
      <IdentityStep kind="dropshipper" rejected={verification} onSubmitted={() => { void reload(); }} />
    </OnboardingShell>
  );
};

export default function DropshipperPage() {
  const { session, profile, loading } = useAuth();
  const { hydrated, dropshipperProfile } = useGlobalStore();

  if (loading || (session && !hydrated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session || !profile) {
    return <DropshipperRegister />;
  }

  if (profile.role === 'admin') {
    return (
      <DropshipperDashboard />
    );
  }

  if (profile.role === 'dropshipper') {
    // Directly-registered dropshippers never went through store setup — send
    // them there first so they always have a working storefront URL.
    if (!dropshipperProfile) return <CreateStoreForm needsRoleUpdate={false} />;
    // Whole dashboard stays closed until an admin approves their Ghana Card + selfie.
    return <DropshipperVerificationGate />;
  }

  // Signed in as a customer (or supplier) → offer to become a dropshipper.
  return <CreateStoreForm needsRoleUpdate />;
}
