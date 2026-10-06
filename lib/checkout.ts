import { supabase } from './supabase/client';

export const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central', 'Eastern', 'Volta', 'Oti',
  'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
] as const;

// ── GhanaPost GPS digital addresses, e.g. GA-184-9022 ─────────────────────────
// Mirrors is_valid_ghana_post_gps() in supabase/launch-features.sql.

const GPS_PATTERN = /^[A-Z]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/;

const compact = (input: string) => input.replace(/\s+/g, '').toUpperCase();

export function isValidGhanaPostGps(input: string): boolean {
  return GPS_PATTERN.test(compact(input));
}

/** "ga 184 9022" -> "GA-184-9022". Returns the cleaned input unchanged when it isn't a valid code. */
export function normalizeGhanaPostGps(input: string): string {
  const c = compact(input);
  const m = c.match(/^([A-Z]{2,3})-?([0-9]{3,4})-?([0-9]{4})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : c;
}

// ── Delivery quotes ───────────────────────────────────────────────────────────

export interface DeliveryQuote {
  fee: number;
  minDays: number;
  maxDays: number;
  cityRate: boolean;
}

export type QuoteResult =
  | { status: 'ok'; quote: DeliveryQuote }
  | { status: 'not_served' }
  | { status: 'unavailable' };

/** Looks up the delivery fee and estimate for a region/city from the delivery_zones table. */
export async function fetchDeliveryQuote(region: string, city: string): Promise<QuoteResult> {
  const { data, error } = await supabase.rpc('get_delivery_quote', { p_region: region, p_city: city || null });
  // The function is missing until supabase/launch-features.sql has been applied.
  if (error) return { status: 'unavailable' };
  if (!data) return { status: 'not_served' };
  const q = data as { fee: number | string; minDays: number; maxDays: number; cityRate: boolean };
  return {
    status: 'ok',
    quote: { fee: Number(q.fee), minDays: q.minDays, maxDays: q.maxDays, cityRate: q.cityRate },
  };
}

export function formatDeliveryEta(q: Pick<DeliveryQuote, 'minDays' | 'maxDays'>): string {
  if (q.minDays === q.maxDays) return `${q.maxDays} business day${q.maxDays === 1 ? '' : 's'}`;
  return `${q.minDays}–${q.maxDays} business days`;
}
