'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'ldsgh-storage-notice-v1';

/** One-line notice: we only use essential browser storage (sign-in, cart). */
export const CookieNotice: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!localStorage.getItem(KEY));
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* non-critical */
    }
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="Storage notice"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-[70] rounded border border-black/10 bg-white p-4 shadow-2xl text-[12px] text-[#444]"
    >
      <p>
        We only use essential browser storage to keep you signed in and remember your cart. No advertising or tracking
        cookies. <Link href="/privacy" className="font-bold text-[#f04438] hover:underline">Privacy policy</Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 h-9 rounded bg-[#151515] px-4 text-[12px] font-black text-white hover:bg-[#f04438] transition-colors"
      >
        Got it
      </button>
    </div>
  );
};
