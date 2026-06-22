'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthProvider';

/**
 * OAuth redirect target. The Supabase client (detectSessionInUrl) exchanges the
 * code in the URL on load; once auth resolves we send the user on their way.
 */
export default function CallbackPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? '/' : '/login');
  }, [loading, session, router]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] grid place-items-center font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-[#f04438] animate-spin" />
        <p className="text-[13px] font-bold text-[#777]">Signing you in…</p>
      </div>
    </div>
  );
}
