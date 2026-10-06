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
  inviteCount: number;
  joinedAt: string | null;
  createdAt: string;
}

interface WishlistSignupRow {
  id: string;
  email: string;
  role: WishlistRole;
  full_name: string;
  invited_at: string | null;
  invite_count?: number | null;
  joined_at?: string | null;
  created_at: string;
}

export async function getWishlistSignups(): Promise<WishlistSignup[]> {
  const { data, error } = await supabase
    .from('wishlist_signups')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as WishlistSignupRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    fullName: r.full_name,
    invitedAt: r.invited_at,
    inviteCount: r.invite_count ?? 0,
    joinedAt: r.joined_at ?? null,
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

export interface InviteBatchResult {
  sent: number;
  skipped: number;
  failed: string[];
  sentIds: string[];
}

/** Emails sign-up invites in batches of 25 and reports progress. Throws a readable message on failure. */
export async function sendWishlistInvites(
  ids: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<InviteBatchResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');

  const total: InviteBatchResult = { sent: 0, skipped: 0, failed: [], sentIds: [] };
  for (let i = 0; i < ids.length; i += 25) {
    const res = await fetch('/api/wishlist/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids.slice(i, i + 25) }),
    });
    const body = (await res.json().catch(() => ({}))) as Partial<InviteBatchResult> & { error?: string };
    if (!res.ok) {
      if (total.sent === 0 && total.skipped === 0) throw new Error(body.error || 'Could not send invites.');
      break; // earlier batches already went out; report what we have
    }
    total.sent += body.sent ?? 0;
    total.skipped += body.skipped ?? 0;
    total.failed.push(...(body.failed ?? []));
    total.sentIds.push(...(body.sentIds ?? []));
    onProgress?.(Math.min(i + 25, ids.length), ids.length);
  }
  return total;
}
