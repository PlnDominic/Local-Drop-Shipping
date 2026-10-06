import { supabase } from './supabase/client';

async function token(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** True once the admin has switched online payment on. Falls back to false before the database update. */
export async function paymentsRequired(): Promise<boolean> {
  const { data, error } = await supabase.rpc('payments_required');
  return !error && data === true;
}

/** Opens Paystack for these orders. Returns the checkout URL, or throws a readable message. */
export async function startPayment(orderIds: string[]): Promise<string> {
  const t = await token();
  if (!t) throw new Error('Please sign in to pay.');
  const res = await fetch('/api/payments/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds }),
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) throw new Error(body.error || 'Could not start the payment.');
  return body.url;
}

export type PaymentResult = 'paid' | 'already_paid' | 'failed' | 'pending' | 'mismatch' | 'unknown' | 'error';

export async function verifyPayment(reference: string): Promise<PaymentResult> {
  const t = await token();
  if (!t) return 'error';
  const res = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  });
  const body = (await res.json().catch(() => ({}))) as { result?: PaymentResult };
  return res.ok && body.result ? body.result : 'error';
}
