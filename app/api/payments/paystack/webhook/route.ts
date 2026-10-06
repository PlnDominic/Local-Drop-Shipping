import { NextResponse } from 'next/server';
import { validSignature } from '../../../../../lib/server/paystack';
import { settlePayment } from '../../../../../lib/server/payments';
import { dispatchNotifications } from '../../../../../lib/server/notify/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Paystack calls this when a charge completes, even if the customer closed their browser.
 * Set the URL in Paystack: Settings > API Keys & Webhooks > Live Webhook URL.
 * The signature proves it came from Paystack, and we still re-check the transaction with Paystack.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  try {
    const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
    const reference = event.data?.reference;
    if (event.event === 'charge.success' && reference && /^LDK-/.test(reference)) {
      const result = await settlePayment(reference);
      // Let Paystack retry if we could not record it.
      if (result === 'error') return NextResponse.json({ received: false }, { status: 500 });
      if (result === 'paid') void dispatchNotifications(25).catch(() => undefined);
    }
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
  return NextResponse.json({ received: true });
}
