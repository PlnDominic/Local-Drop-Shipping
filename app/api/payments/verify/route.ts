import { NextResponse } from 'next/server';
import { bearerToken, clientForToken } from '../../../../lib/server/receipt';
import { paystackConfigured } from '../../../../lib/server/paystack';
import { settlePayment } from '../../../../lib/server/payments';
import { dispatchNotifications, serviceClient } from '../../../../lib/server/notify/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REF = /^LDK-[a-z0-9-]{6,60}$/i;

/** POST /api/payments/verify { reference }: the customer's return page confirms their payment. */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!paystackConfigured() || !serviceClient()) return NextResponse.json({ error: 'Online payment is not set up yet.' }, { status: 501 });

  let reference = '';
  try {
    reference = String(((await req.json()) as { reference?: unknown }).reference ?? '');
  } catch {
    /* fall through */
  }
  if (!REF.test(reference)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  try {
    // Row-level security means only the payer (or an admin) can see this payment.
    const { data: row } = await clientForToken(token).from('checkout_payments').select('reference').eq('reference', reference).maybeSingle();
    if (!row) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });

    const result = await settlePayment(reference);
    if (result === 'paid') void dispatchNotifications(25).catch(() => undefined);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: 'Could not confirm the payment.' }, { status: 500 });
  }
}
