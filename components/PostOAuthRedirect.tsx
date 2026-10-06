'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthProvider';
import { landingPath } from '../lib/auth/landing';

/**
 * Safety net for Google sign-in. If Supabase sends the browser back to the site root (its Site URL)
 * instead of /callback, the URL carries the OAuth result. Once the session is ready, move the
 * person to their dashboard instead of leaving them on the waitlist page.
 */
export function PostOAuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, profile, loading } = useAuth();
  const returning = useRef<boolean | null>(null);

  if (returning.current === null && typeof window !== 'undefined') {
    const { hash, search, pathname: p } = window.location;
    returning.current = p === '/' && (hash.includes('access_token=') || new URLSearchParams(search).has('code'));
  }

  useEffect(() => {
    if (!returning.current || loading || pathname !== '/') return;
    if (session && profile) {
      returning.current = false;
      router.replace(landingPath(profile.role));
    }
  }, [loading, session, profile, pathname, router]);

  return null;
}
