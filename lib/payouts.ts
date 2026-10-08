import { supabase } from './supabase/client';

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'rejected' | 'cancelled';
export type MomoNetwork = 'MTN' | 'VOD' | 'ATL';

export interface PayoutRequest {
  id: string;
  reference: string;
  user_id: string;
  amount: number | string;
  fee: number | string;
  net_amount: number | string;
  network: MomoNetwork | null;
  account_number: string | null;
  account_name: string;
  status: PayoutStatus;
  paid_manually: boolean;
  transfer_status: string | null;
  last_error: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PayoutSettings {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  feeFlat: number;
  feePercent: number;
  paused: boolean;
}

/** Paystack's codes for Ghana mobile money networks. */
export const MOMO_NETWORKS: { code: MomoNetwork; label: string }[] = [
  { code: 'MTN', label: 'MTN MoMo' },
  { code: 'VOD', label: 'Telecel Cash' },
  { code: 'ATL', label: 'AT Money' },
];

export const networkLabel = (code: string | null): string =>
  MOMO_NETWORKS.find((n) => n.code === code)?.label ?? 'Mobile money';

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: 'Waiting for review',
  processing: 'Sending',
  paid: 'Sent',
  failed: 'Failed, returned',
  rejected: 'Declined, returned',
  cancelled: 'Cancelled',
};

export const PAYOUT_STATUS_STYLE: Record<PayoutStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

/** The fee taken from a withdrawal, matching request_payout() in the database. */
export function payoutFee(amount: number, s: PayoutSettings): number {
  return Math.round((s.feeFlat + (amount * s.feePercent) / 100) * 100) / 100;
}

/** Null when the database update (supabase/payouts.sql) has not been applied yet. */
export async function getPayoutSettings(): Promise<PayoutSettings | null> {
  const { data, error } = await supabase.rpc('payout_settings');
  if (error || !data) return null;
  const s = data as Record<string, unknown>;
  return {
    minAmount: Number(s.minAmount),
    maxAmount: Number(s.maxAmount),
    dailyLimit: Number(s.dailyLimit),
    feeFlat: Number(s.feeFlat),
    feePercent: Number(s.feePercent),
    paused: s.paused === true,
  };
}

export async function listMyPayouts(userId: string): Promise<PayoutRequest[]> {
  const { data, error } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return error ? [] : (data as PayoutRequest[]);
}

/** Holds the amount from the wallet and queues it for review. Throws a readable message. */
export async function requestPayout(args: { amount: number; network: MomoNetwork; accountNumber: string; accountName: string }): Promise<PayoutRequest> {
  const { data, error } = await supabase.rpc('request_payout', {
    p_amount: args.amount,
    p_network: args.network,
    p_account_number: args.accountNumber,
    p_account_name: args.accountName,
  });
  if (error) throw new Error(error.message);
  return data as PayoutRequest;
}

export async function cancelPayout(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_payout', { p_id: id });
  if (error) throw new Error(error.message);
}

/** Admin: send with Paystack, check its progress, or confirm an OTP. Returns the outcome or throws. */
export async function adminPayoutAction(id: string, action: 'send' | 'check' | 'otp', otp?: string): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  const res = await fetch(`/api/admin/payouts/${id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, otp }),
  });
  const body = (await res.json().catch(() => ({}))) as { result?: string; error?: string };
  if (!res.ok) throw new Error(body.error || 'Something went wrong.');
  return body.result ?? 'pending';
}
