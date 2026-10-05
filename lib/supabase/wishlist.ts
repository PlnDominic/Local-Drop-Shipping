import { supabase } from './client';

export type WishlistRole = 'dropshipper' | 'supplier';

/** Adds an email to the pre-launch wishlist. Returns false if it was already on it. */
export async function joinWishlist(email: string, role: WishlistRole, name: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('join_wishlist', {
    p_email: email,
    p_role: role,
    p_name: name,
  });
  if (error) throw error;
  return data as boolean;
}

export async function getWishlistCounts(): Promise<Record<WishlistRole, number>> {
  const { data, error } = await supabase.rpc('wishlist_counts');
  if (error) throw error;
  return data as Record<WishlistRole, number>;
}

// ── Admin (RLS restricts these to the admin role) ────────────────────────────

export interface WishlistSignup {
  id: string;
  email: string;
  role: WishlistRole;
  fullName: string;
  invitedAt: string | null;
  createdAt: string;
}

interface WishlistSignupRow {
  id: string;
  email: string;
  role: WishlistRole;
  full_name: string;
  invited_at: string | null;
  created_at: string;
}

export async function getWishlistSignups(): Promise<WishlistSignup[]> {
  const { data, error } = await supabase
    .from('wishlist_signups')
    .select('id, email, role, full_name, invited_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as WishlistSignupRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    fullName: r.full_name,
    invitedAt: r.invited_at,
    createdAt: r.created_at,
  }));
}

/** Sets (invited = true) or clears invited_at; returns the timestamp written. */
export async function setWishlistInvited(ids: string[], invited: boolean): Promise<string | null> {
  const invitedAt = invited ? new Date().toISOString() : null;
  const { error } = await supabase.from('wishlist_signups').update({ invited_at: invitedAt }).in('id', ids);
  if (error) throw error;
  return invitedAt;
}

export async function deleteWishlistSignups(ids: string[]): Promise<void> {
  const { error } = await supabase.from('wishlist_signups').delete().in('id', ids);
  if (error) throw error;
}
