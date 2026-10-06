import { supabase } from './supabase/client';

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Downloads the receipt PDF for an order the signed-in user may see. Throws a readable message on failure. */
export async function downloadReceipt(orderId: string, orderNumber: string): Promise<void> {
  const token = await accessToken();
  if (!token) throw new Error('Please sign in to download your receipt.');

  const res = await fetch(`/api/receipts/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const msg = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(msg?.error || 'Could not download the receipt.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${orderNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Fire-and-forget: emails the receipt after an order is placed. Silent if email isn't set up. */
export function emailReceipt(orderId: string): void {
  void (async () => {
    try {
      const token = await accessToken();
      if (!token) return;
      await fetch(`/api/orders/${orderId}/email-receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* receipts can still be downloaded from My Orders */
    }
  })();
}
