import { createHmac, timingSafeEqual } from 'node:crypto';

const base = () => process.env.PAYSTACK_API_URL || 'https://api.paystack.co';

export const paystackConfigured = (): boolean => Boolean(process.env.PAYSTACK_SECRET_KEY);

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(`${base()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(20000),
    });
    const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
    return { ok: res.ok && json.status === true, data: json.data, message: json.message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error' };
  }
}

/** Starts a hosted checkout (mobile money or card). Amount is GHS; Paystack wants pesewas. */
export function initializeTransaction(args: { email: string; amountGhs: number; reference: string; callbackUrl: string; metadata?: Record<string, unknown> }) {
  return call<{ authorization_url: string; reference: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: args.email,
      amount: Math.round(args.amountGhs * 100),
      currency: 'GHS',
      reference: args.reference,
      callback_url: args.callbackUrl,
      channels: ['mobile_money', 'card'],
      metadata: args.metadata,
    }),
  });
}

export interface VerifiedTransaction {
  status: string; // 'success' | 'failed' | 'abandoned' | ...
  amount: number; // pesewas
  currency: string;
  channel: string | null;
  reference: string;
}

/** The source of truth: ask Paystack, never trust a browser or a webhook body alone. */
export function verifyTransaction(reference: string) {
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Webhook authenticity: HMAC-SHA512 of the raw body with the secret key. */
export function validSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
