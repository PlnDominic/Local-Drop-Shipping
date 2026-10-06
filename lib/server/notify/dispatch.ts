import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, sendSms, sendWhatsApp, type SendResult } from './providers';

interface OutboxRow {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  to_address: string;
  subject: string;
  body: string;
}

/**
 * A client with the service-role key. That key bypasses row-level security, so it is
 * only ever created on the server and only used to run the outbox.
 */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function send(row: OutboxRow): Promise<SendResult> {
  switch (row.channel) {
    case 'email':
      return sendEmail(row.to_address, row.subject, row.body);
    case 'sms':
      return sendSms(row.to_address, row.body);
    case 'whatsapp':
      return sendWhatsApp(row.to_address, row.body);
    default:
      return Promise.resolve({ ok: false, skipped: true, reason: 'Unknown channel' });
  }
}

export interface DispatchSummary {
  claimed: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Sends everything that is due. Safe to call often; each message is claimed once. */
export async function dispatchNotifications(limit = 25): Promise<DispatchSummary> {
  const db = serviceClient();
  if (!db) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  const { data, error } = await db.rpc('claim_notifications', { p_limit: limit });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as OutboxRow[];
  const summary: DispatchSummary = { claimed: rows.length, sent: 0, skipped: 0, failed: 0 };

  await Promise.all(
    rows.map(async (row) => {
      const result = await send(row);
      if (result.ok) {
        summary.sent += 1;
        await db.rpc('finish_notification', { p_id: row.id, p_status: 'sent' });
      } else if (result.skipped) {
        summary.skipped += 1;
        await db.rpc('finish_notification', { p_id: row.id, p_status: 'skipped', p_error: result.reason });
      } else {
        summary.failed += 1;
        await db.rpc('finish_notification', { p_id: row.id, p_status: 'failed', p_error: result.error });
      }
    }),
  );

  return summary;
}
