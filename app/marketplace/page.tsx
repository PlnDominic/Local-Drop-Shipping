'use client';

import { Suspense } from 'react';
import { Marketplace } from '../../views/Marketplace';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" /></div>}>
      <Marketplace />
    </Suspense>
  );
}
