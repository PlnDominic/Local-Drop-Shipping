import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from './notify/dispatch';
import {
  createTransferRecipient,
  finalizeTransfer,
  initiateTransfer,
  paystackConfigured,
  verifyTransfer,
  type MomoNetwork,
  type PaystackTransfer,
} from './paystack';

interface PayoutRow {
  id: string;
  reference: string;
  net_amount: number | string;
  network: MomoNetwork | null;
  account_number: string | null;
  account_name: string;
  status: string;
  recipient_code: string | null;
  transfer_code: string | null;
  transfer_status: string | null;
}

export interface PayoutActionResult {
  ok: boolean;
  httpStatus: number;
  /** For the admin: 'paid', 'failed', 'otp', 'pending', 'requeued', ... */
  result?: string;
  error?: string;
}

const FAILED = new Set(['failed', 'reversed', 'abandoned', 'blocked', 'rejected']);
const fail = (httpStatus: number, error: string): PayoutActionResult => ({ ok: false, httpStatus, error });

/**
 * Records what Paystack says about a transfer, and settles the payout once the outcome is final
 * (paid, or failed with the money returned to the wallet). Safe to call repeatedly.
 */
async function applyTransferStatus(db: SupabaseClient, row: PayoutRow, t: PaystackTransfer | undefined, actor: string | null): Promise<PayoutActionResult> {
  const status = t?.status ?? 'pending';
  // Keep Paystack's transfer code even when the outcome is already final.
  const recorded = await db.rpc('payout_record_transfer', {
    p_id: row.id,
    p_recipient_code: null,
    p_transfer_code: t?.transfer_code ?? null,
    p_transfer_status: status,
    p_error: null,
    p_actor: actor,
  });
  if (recorded.error) return fail(500, recorded.error.message);
  if (status !== 'success' && !FAILED.has(status)) return { ok: true, httpStatus: 200, result: status };

  const { data, error } = await db.rpc('settle_payout', {
    p_reference: row.reference,
    p_outcome: status === 'success' ? 'success' : status === 'reversed' ? 'reversed' : 'failed',
    p_reason: t?.reason || `Paystack marked the transfer ${status}.`,
    p_actor: actor,
  });
  return error ? fail(500, error.message) : { ok: true, httpStatus: 200, result: data as string };
}

function setup(): { db: SupabaseClient } | { error: PayoutActionResult } {
  if (!paystackConfigured()) return { error: fail(501, 'Online payouts are not set up yet. Add PAYSTACK_SECRET_KEY.') };
  const db = serviceClient();
  if (!db) return { error: fail(501, 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.') };
  return { db };
}

async function loadPayout(db: SupabaseClient, column: 'id' | 'reference', value: string): Promise<PayoutRow | null> {
  const { data } = await db
    .from('payout_requests')
    .select('id, reference, net_amount, network, account_number, account_name, status, recipient_code, transfer_code, transfer_status')
    .eq(column, value)
    .maybeSingle();
  return (data as PayoutRow | null) ?? null;
}

/**
 * Admin approved a withdrawal: claim it (as the admin, so a double click cannot send twice),
 * then ask Paystack to send it. A refusal puts it back in the queue; no answer leaves it
 * "sending" until Paystack confirms either way, so it can never be paid twice.
 */
export async function sendPayout(adminClient: SupabaseClient, adminId: string, id: string): Promise<PayoutActionResult> {
  const s = setup();
  if ('error' in s) return s.error;
  const { db } = s;

  const { data: claimed, error } = await adminClient.rpc('begin_payout', { p_id: id });
  if (error || !claimed) return fail(400, error?.message || 'Could not start this payout.');
  const row = claimed as PayoutRow;

  let recipientCode = row.recipient_code;
  if (!recipientCode) {
    const r = await createTransferRecipient({ name: row.account_name, accountNumber: row.account_number ?? '', network: row.network as MomoNetwork });
    if (!r.ok || !r.data?.recipient_code) {
      const reason = r.httpStatus === 0 ? 'Paystack did not answer' : `Paystack refused the account: ${r.message || 'unknown error'}`;
      await db.rpc('payout_send_failed', { p_id: row.id, p_error: reason, p_actor: adminId });
      return fail(502, `${reason}. The withdrawal is back in the queue.`);
    }
    recipientCode = r.data.recipient_code;
    await db.rpc('payout_record_transfer', {
      p_id: row.id, p_recipient_code: recipientCode, p_transfer_code: null, p_transfer_status: null, p_error: null, p_actor: adminId,
    });
  }

  const t = await initiateTransfer({
    amountGhs: Number(row.net_amount),
    recipientCode,
    reference: row.reference,
    reason: `Wallet withdrawal ${row.reference}`,
  });

  if (!t.ok) {
    if (t.httpStatus >= 400 && t.httpStatus < 500) {
      // Paystack rejected the request outright, so no transfer exists: safe to try again later.
      const reason = `Paystack did not accept the transfer: ${t.message || 'unknown error'}`;
      await db.rpc('payout_send_failed', { p_id: row.id, p_error: reason, p_actor: adminId });
      return fail(502, `${reason}. The withdrawal is back in the queue.`);
    }
    // No clear answer: the transfer may exist. Keep it "sending" and let Check status decide.
    await db.rpc('payout_record_transfer', {
      p_id: row.id, p_recipient_code: null, p_transfer_code: null, p_transfer_status: null,
      p_error: 'Paystack did not answer. Use Check status before doing anything else.', p_actor: adminId,
    });
    return fail(504, 'Paystack did not answer. Wait a minute, then use Check status. Do not send it again.');
  }

  return applyTransferStatus(db, row, t.data, adminId);
}

/** Asks Paystack for the latest state of a payout that is being sent. */
export async function checkPayout(adminId: string, id: string): Promise<PayoutActionResult> {
  const s = setup();
  if ('error' in s) return s.error;
  const { db } = s;
  const row = await loadPayout(db, 'id', id);
  if (!row) return fail(404, 'Withdrawal not found.');
  if (row.status !== 'processing') return { ok: true, httpStatus: 200, result: row.status };

  const v = await verifyTransfer(row.reference);
  if (!v.ok) {
    const notFound = v.httpStatus === 404 || (v.httpStatus === 400 && /not found/i.test(v.message ?? ''));
    if (notFound && !row.transfer_code) {
      await db.rpc('payout_send_failed', {
        p_id: row.id, p_error: 'Paystack has no record of this transfer, so nothing was sent. You can send it again.', p_actor: adminId,
      });
      return { ok: true, httpStatus: 200, result: 'requeued' };
    }
    return fail(502, `Could not check with Paystack: ${v.message || 'no answer'}. Try again shortly.`);
  }
  return applyTransferStatus(db, row, v.data, adminId);
}

/** Completes a transfer that Paystack is holding for an OTP (sent to the Paystack account owner). */
export async function submitPayoutOtp(adminId: string, id: string, otp: string): Promise<PayoutActionResult> {
  const s = setup();
  if ('error' in s) return s.error;
  const { db } = s;
  const row = await loadPayout(db, 'id', id);
  if (!row) return fail(404, 'Withdrawal not found.');
  if (row.status !== 'processing' || !row.transfer_code) return fail(400, 'This withdrawal is not waiting for an OTP.');

  const f = await finalizeTransfer(row.transfer_code, otp);
  if (!f.ok) return fail(f.httpStatus === 0 ? 504 : 400, f.message || 'Paystack did not accept the OTP.');
  return applyTransferStatus(db, row, f.data, adminId);
}

/** Webhook: Paystack says a transfer finished. Re-checked with Paystack before anything is recorded. */
export async function settlePayoutFromWebhook(reference: string): Promise<'ok' | 'unknown' | 'error'> {
  const db = serviceClient();
  if (!db) return 'error';
  const row = await loadPayout(db, 'reference', reference);
  if (!row) return 'unknown';

  const v = await verifyTransfer(reference);
  if (!v.ok) return 'error';
  const res = await applyTransferStatus(db, row, v.data, null);
  return res.ok ? 'ok' : 'error';
}
