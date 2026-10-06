'use client';

import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { useGlobalStore } from '../store/globalStore';

/** Small "Verified" tick shown beside suppliers whose identity and business documents were checked by us. */
export const VerifiedBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    title="Identity and business documents checked by Local Drop Shipping GH"
    className={`inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 ${className}`}
  >
    <BadgeCheck size={10} /> Verified
  </span>
);

/** "By <supplier>" with the Verified badge when the supplier has earned it. */
export const SupplierName: React.FC<{ supplierId: string; name: string }> = ({ supplierId, name }) => {
  const verified = useGlobalStore((s) => s.supplierProfiles.some((p) => p.id === supplierId && p.isVerified));
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      By {name}
      {verified && <VerifiedBadge />}
    </span>
  );
};
