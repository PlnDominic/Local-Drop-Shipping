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
  signInWithGoogle: () => Promise<{ error: string | null }>;
  /** Emails a password-reset link that lands on /reset-password. */
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  /** Sets a new password for the current (recovery) session. */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  /** Exchanges the one-time token from the reset email for a recovery session (on button press, not page load). */
  verifyRecovery: (tokenHash: string) => Promise<{ error: string | null }>;
  /** `everywhere` also ends sessions on other devices; used after a password reset. */
  signOut: (opts?: { everywhere?: boolean }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** Turns Supabase's terse auth errors into something a person can act on. */
function friendlyAuthError(message: string, status?: number): string {
  const m = message.toLowerCase();
  if (status === 429 || m.includes('rate limit') || m.includes('security purposes')) {
    return 'Too many requests. Please wait a minute and try again.';
  }
  if (m.includes('same password') || m.includes('different from the old')) {
    return 'Choose a password you have not used before.';
  }
  if (m.includes('weak') || m.includes('at least')) {
    return 'That password is too weak. Use at least 8 characters with a mix of letters and numbers.';
  }
  return message;
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

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // After Google auth, Supabase redirects to /callback where the client
      // (detectSessionInUrl) completes the session. This path must be in the
      // Supabase "Redirect URLs" allow list.
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/callback` : undefined,
      },
    });
    return { error: error?.message ?? null };
  };

  const resetPassword: AuthContextValue['resetPassword'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Must be in the Supabase "Redirect URLs" allow list.
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    return { error: error ? friendlyAuthError(error.message, error.status) : null };
  };

  const verifyRecovery: AuthContextValue['verifyRecovery'] = async (tokenHash) => {
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    return { error: error ? 'This reset link has expired or was already used. Request a new one.' : null };
  };

  const updatePassword: AuthContextValue['updatePassword'] = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? friendlyAuthError(error.message, error.status) : null };
  };

  const signOut = async (opts?: { everywhere?: boolean }) => {
    await supabase.auth.signOut(opts?.everywhere ? { scope: 'global' } : undefined);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await loadProfile(session?.user.id);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signInWithGoogle, resetPassword, updatePassword, verifyRecovery, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
