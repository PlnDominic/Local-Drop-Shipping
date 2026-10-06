import { serviceClient } from './notify/dispatch';
import { verifyTransaction } from './paystack';

export type SettleResult = 'paid' | 'already_paid' | 'mismatch' | 'failed' | 'pending' | 'unknown' | 'error';

/**
 * Checks a payment with Paystack and records the outcome. Safe to call repeatedly, from the
 * webhook, the return page and retries: marking paid is idempotent in the database.
 */
export async function settlePayment(reference: string): Promise<SettleResult> {
  const db = serviceClient();
  if (!db) return 'error';

  const tx = await verifyTransaction(reference);
  if (!tx.ok || !tx.data) return 'error';

  if (tx.data.status === 'success') {
    const { data, error } = await db.rpc('mark_payment_paid', {
      p_reference: reference,
      p_amount_pesewas: tx.data.amount,
      p_currency: tx.data.currency,
      p_channel: tx.data.channel,
    });
    return error ? 'error' : (data as SettleResult);
  }
  if (tx.data.status === 'failed' || tx.data.status === 'abandoned') {
    await db.rpc('mark_payment_failed', { p_reference: reference });
    return 'failed';
  }
  return 'pending';
}
