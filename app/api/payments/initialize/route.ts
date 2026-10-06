import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { bearerToken, clientForToken } from '../../../../lib/server/receipt';
import { initializeTransaction, paystackConfigured } from '../../../../lib/server/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/payments/initialize  { orderIds: string[] }
 * Opens a Paystack checkout for the caller's own unpaid orders. The amount is worked out in the
 * database from the orders themselves, so the browser cannot choose what it pays.
 */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!paystackConfigured()) return NextResponse.json({ error: 'Online payment is not set up yet.' }, { status: 501 });

  let orderIds: string[] = [];
  try {
    const body = (await req.json()) as { orderIds?: unknown };
    orderIds = Array.isArray(body.orderIds) ? body.orderIds.filter((v): v is string => typeof v === 'string' && UUID.test(v)) : [];
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  if (orderIds.length === 0 || orderIds.length > 10) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  try {
    const sb = clientForToken(token);
    const { data: auth } = await sb.auth.getUser(token);
    const email = auth.user?.email;
    if (!auth.user || !email) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

    const reference = `LDK-${Date.now().toString(36)}-${randomBytes(5).toString('hex')}`;
    const { data: pay, error } = await sb.rpc('create_payment', { p_order_ids: orderIds, p_reference: reference });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const origin = new URL(req.url).origin;
    const init = await initializeTransaction({
      email,
      amountGhs: Number((pay as { amount: number | string }).amount),
      reference,
      callbackUrl: `${origin}/orders`,
      metadata: { orderIds },
    });
    if (!init.ok || !init.data) return NextResponse.json({ error: 'The payment service is unavailable. Please try again.' }, { status: 502 });

    return NextResponse.json({ url: init.data.authorization_url, reference });
  } catch {
    return NextResponse.json({ error: 'Could not start the payment.' }, { status: 500 });
  }
}
