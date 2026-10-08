import { createHmac, timingSafeEqual } from 'node:crypto';

const base = () => process.env.PAYSTACK_API_URL || 'https://api.paystack.co';

export const paystackConfigured = (): boolean => Boolean(process.env.PAYSTACK_SECRET_KEY);

/** httpStatus is 0 when Paystack never answered (network error or timeout). */
export interface PaystackResult<T> { ok: boolean; data?: T; message?: string; httpStatus: number }

async function call<T>(path: string, init?: RequestInit): Promise<PaystackResult<T>> {
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
    return { ok: res.ok && json.status === true, data: json.data, message: json.message, httpStatus: res.status };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', httpStatus: 0 };
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

// ─── Transfers (wallet withdrawals to mobile money) ──────────────────────────
// Needs Transfers enabled on the Paystack account and a funded Paystack balance.

/** Paystack's codes for Ghana mobile money: MTN, Telecel (formerly Vodafone) and AT (formerly AirtelTigo). */
export type MomoNetwork = 'MTN' | 'VOD' | 'ATL';

export interface PaystackTransfer {
  transfer_code: string;
  reference: string;
  // 'pending' | 'otp' | 'received' | 'success' | 'failed' | 'reversed' | 'abandoned' | 'blocked' | 'rejected'
  status: string;
  reason?: string | null;
}

/** Registers the mobile money account to pay. accountNumber is local format, e.g. 0241234567. */
export function createTransferRecipient(args: { name: string; accountNumber: string; network: MomoNetwork }) {
  return call<{ recipient_code: string }>('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'mobile_money',
      name: args.name,
      account_number: args.accountNumber,
      bank_code: args.network,
      currency: 'GHS',
    }),
  });
}

/** Sends money from the Paystack balance. The reference makes a repeated call safe. Amount is GHS. */
export function initiateTransfer(args: { amountGhs: number; recipientCode: string; reference: string; reason: string }) {
  return call<PaystackTransfer>('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(args.amountGhs * 100),
      currency: 'GHS',
      recipient: args.recipientCode,
      reference: args.reference,
      reason: args.reason,
    }),
  });
}

/** Only needed when the Paystack account still asks for an OTP on every transfer. */
export function finalizeTransfer(transferCode: string, otp: string) {
  return call<PaystackTransfer>('/transfer/finalize_transfer', {
    method: 'POST',
    body: JSON.stringify({ transfer_code: transferCode, otp }),
  });
}

/** The source of truth for a transfer's outcome. */
export function verifyTransfer(reference: string) {
  return call<PaystackTransfer>(`/transfer/verify/${encodeURIComponent(reference)}`);
}
