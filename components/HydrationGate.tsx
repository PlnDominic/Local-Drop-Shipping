'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';
import { useGlobalStore } from '../store/globalStore';

/**
 * Bridges Supabase Auth → the app store: sets the current user id from the
 * authenticated profile and (re)hydrates live data from Supabase. Renders nothing.
 */
export const HydrationGate: React.FC = () => {
  const { profile, loading } = useAuth();
  const setCurrentUserId = useGlobalStore((s) => s.setCurrentUserId);
  const hydrate = useGlobalStore((s) => s.hydrate);

  useEffect(() => {
    if (loading) return;
    setCurrentUserId(profile?.id ?? null);
    void hydrate();
  }, [loading, profile?.id, setCurrentUserId, hydrate]);

  return null;
};
