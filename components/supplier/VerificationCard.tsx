'use client';

import React from 'react';
import { BadgeCheck, Clock, ShieldCheck } from 'lucide-react';
import { IdentityStep, useMyVerification } from '../onboarding/Onboarding';

/** Supplier-facing verification tab: shows the review status, or the same identity form used in onboarding. */
export const VerificationCard: React.FC = () => {
  const { verification: current, loading, unavailable, reload } = useMyVerification('supplier');

  if (loading) return <div className="h-40 rounded bg-gray-100 animate-pulse" />;
  if (unavailable) {
    return <div className="rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">Verification isn&apos;t available yet. Please check back soon.</div>;
  }

  if (current?.status === 'approved') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex items-start gap-3">
        <BadgeCheck size={28} className="text-emerald-600 flex-shrink-0" />
        <div>
          <h2 className="text-[16px] font-semibold text-emerald-900">You&apos;re verified</h2>
          <p className="mt-1 text-[13px] text-emerald-800">A Verified badge now shows next to your name on your products, so dropshippers and customers know who they are buying from.</p>
        </div>
      </div>
    );
  }

  if (current?.status === 'pending') {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 flex items-start gap-3">
        <Clock size={28} className="text-yellow-600 flex-shrink-0" />
        <div>
          <h2 className="text-[16px] font-semibold text-[#5c4a00]">Under review</h2>
          <p className="mt-1 text-[13px] text-[#5c4a00]">
            We received your documents on {new Date(current.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} (Ghana Card {current.ghanaCardNumber.slice(0, 7)}•••••).
            We usually respond within 2 business days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-5">
      <div className="flex items-start gap-3">
        <ShieldCheck size={26} className="text-[#d92d20] flex-shrink-0" />
        <div>
          <h2 className="text-[18px] font-semibold text-[#1d1d1f]">Get the Verified badge</h2>
          <p className="mt-1 text-[13px] text-[#6e6e73]">
            Verified suppliers earn trust and sell more. Send your Ghana Card, a selfie and, if you have one, your business registration.
          </p>
        </div>
      </div>
      <IdentityStep kind="supplier" rejected={current} onSubmitted={() => { void reload(); }} />
    </div>
  );
};
