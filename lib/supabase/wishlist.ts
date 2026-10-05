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
