import { supabase } from './supabase/client';

/** Fire-and-forget: asks the server to send any queued alerts. Silent if not configured. */
export function kickNotifications(): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch('/api/notifications/dispatch', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {
      /* alerts are retried by the next trigger or the scheduler */
    }
  })();
}

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  phone: string;
}

export const DEFAULT_PREFS: NotificationPrefs = { email: true, sms: true, whatsapp: false, phone: '' };

export async function loadPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from('notification_prefs')
    .select('email_enabled, sms_enabled, whatsapp_enabled, phone')
    .eq('user_id', userId)
    .maybeSingle();
  const row = data as { email_enabled: boolean; sms_enabled: boolean; whatsapp_enabled: boolean; phone: string | null } | null;
  if (!row) return DEFAULT_PREFS;
  return { email: row.email_enabled, sms: row.sms_enabled, whatsapp: row.whatsapp_enabled, phone: row.phone ?? '' };
}

export async function savePrefs(p: NotificationPrefs): Promise<void> {
  const { error } = await supabase.rpc('save_notification_prefs', {
    p_email: p.email,
    p_sms: p.sms,
    p_whatsapp: p.whatsapp,
    p_phone: p.phone,
  });
  if (error) throw new Error(error.message);
}
