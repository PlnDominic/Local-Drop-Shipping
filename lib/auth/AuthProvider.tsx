'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import { mapUser, type UserRow } from '../supabase/types';
import type { UserProfile } from '../api/types';

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'customer' | 'dropshipper' | 'supplier';
}

interface AuthContextValue {
  session: Session | null;
  /** The signed-in user's profile row (id, role, name, …) or null when logged out. */
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role, avatar_url, is_verified, created_at')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data ? mapUser(data as UserRow) : null);
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadProfile(newSession?.user.id);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue['signUp'] = async ({ email, password, fullName, phone, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Consumed by the public.handle_new_user() trigger to populate the profile row.
      options: { data: { full_name: fullName, phone, role } },
    });
    // When email confirmation is enabled, a user exists but no session is created yet.
    return { error: error?.message ?? null, needsConfirmation: !!data.user && !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    await loadProfile(session?.user.id);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
