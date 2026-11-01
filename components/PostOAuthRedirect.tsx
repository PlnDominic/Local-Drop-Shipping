'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthProvider';
import { supabase } from '../lib/supabase/client';
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

  // A reset link opened on any page (e.g. Supabase fell back to the Site URL because
  // /reset-password was not in its Redirect URLs) still ends up on the reset form.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        router.replace('/reset-password');
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!returning.current || loading || pathname !== '/') return;
    if (session && profile) {
      returning.current = false;
      router.replace(landingPath(profile.role));
    }
  }, [loading, session, profile, pathname, router]);

  return null;
}
