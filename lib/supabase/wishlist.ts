import { supabase } from './client';

export type WishKind = 'product' | 'feature' | 'supplier';
export type WishStatus = 'open' | 'planned' | 'available' | 'declined';

export interface Wish {
  id: string;
  kind: WishKind;
  title: string;
  details: string;
  category: string | null;
  region: string | null;
  submitterName: string;
  voteCount: number;
  status: WishStatus;
  createdAt: string;
}

interface WishRow {
  id: string;
  kind: WishKind;
  title: string;
  details: string;
  category: string | null;
  region: string | null;
  submitter_name: string;
  vote_count: number;
  status: WishStatus;
  created_at: string;
}

const mapWish = (row: WishRow): Wish => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  details: row.details,
  category: row.category,
  region: row.region,
  submitterName: row.submitter_name,
  voteCount: row.vote_count,
  status: row.status,
  createdAt: row.created_at,
});

// ── Anonymous voter identity (browser-local) ──────────────────────────────────

const VOTER_KEY = 'ldsgh-wishlist-voter';
const VOTED_KEY = 'ldsgh-wishlist-voted';

/** Random per-browser key so anonymous visitors can vote once per wish. */
export function getVoterKey(): string {
  try {
    let key = localStorage.getItem(VOTER_KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(VOTER_KEY, key);
    }
    return key;
  } catch {
    // Storage blocked (private mode): fall back to a per-session key.
    return crypto.randomUUID();
  }
}

export function getVotedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function saveVotedIds(ids: Set<string>) {
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify([...ids]));
  } catch {
    /* non-critical */
  }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getWishes(): Promise<Wish[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('id, kind, title, details, category, region, submitter_name, vote_count, status, created_at')
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data as WishRow[]).map(mapWish);
}

export interface NewWish {
  kind: WishKind;
  title: string;
  details: string;
  category: string;
  region: string;
  name: string;
  contact: string;
}

export async function submitWish(wish: NewWish): Promise<Wish> {
  const { data, error } = await supabase.rpc('submit_wish', {
    p_kind: wish.kind,
    p_title: wish.title,
    p_details: wish.details,
    p_category: wish.category,
    p_region: wish.region,
    p_name: wish.name,
    p_contact: wish.contact,
    p_voter_key: getVoterKey(),
  });
  if (error) throw error;
  return mapWish(data as WishRow);
}

export async function toggleWishVote(itemId: string): Promise<{ voted: boolean; voteCount: number }> {
  const { data, error } = await supabase.rpc('toggle_wish_vote', {
    p_item_id: itemId,
    p_voter_key: getVoterKey(),
  });
  if (error) throw error;
  return data as { voted: boolean; voteCount: number };
}
