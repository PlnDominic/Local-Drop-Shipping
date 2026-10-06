'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthProvider';
import { landingPath } from '../../lib/auth/landing';

/**
 * OAuth redirect target. The Supabase client (detectSessionInUrl) exchanges the
 * code in the URL on load; once auth resolves we send the user on their way.
 */
export default function CallbackPage() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) { router.replace('/login'); return; }
    // Wait for the profile so we know which dashboard to open.
    if (profile) { router.replace(landingPath(profile.role)); return; }
    // No profile row yet: do not leave them spinning.
    const t = setTimeout(() => router.replace('/marketplace'), 4000);
    return () => clearTimeout(t);
  }, [loading, session, profile, router]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] grid place-items-center font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-[#f04438] animate-spin" />
        <p className="text-[13px] font-bold text-[#777]">Signing you in…</p>
      </div>
    </div>
  );
}
