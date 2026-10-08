import { NextResponse } from 'next/server';
import { bearerToken, clientForToken } from '../../../../../lib/server/receipt';
import { checkPayout, sendPayout, submitPayoutOtp } from '../../../../../lib/server/payouts';
import { dispatchNotifications } from '../../../../../lib/server/notify/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/payouts/:id  (admin only)
 *   { action: 'send' }              approve and send the withdrawal with Paystack
 *   { action: 'check' }             ask Paystack how a sending withdrawal is doing
 *   { action: 'otp', otp: '123456' } finish a transfer Paystack is holding for an OTP
 * Rejecting and "paid by hand" need no Paystack call; the admin page does those directly.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!UUID.test(id)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  let action = '';
  let otp = '';
  try {
    const body = (await req.json()) as { action?: unknown; otp?: unknown };
    action = typeof body.action === 'string' ? body.action : '';
    otp = typeof body.otp === 'string' ? body.otp.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  try {
    const sb = clientForToken(token);
    const { data: auth } = await sb.auth.getUser(token);
    if (!auth.user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const { data: me } = await sb.from('users').select('role').eq('id', auth.user.id).maybeSingle();
    if ((me as { role?: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can send withdrawals.' }, { status: 403 });
    }

    let res;
    if (action === 'send') res = await sendPayout(sb, auth.user.id, id);
    else if (action === 'check') res = await checkPayout(auth.user.id, id);
    else if (action === 'otp' && /^\d{4,8}$/.test(otp)) res = await submitPayoutOtp(auth.user.id, id, otp);
    else return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

    // Paid or failed payouts queue an email to the owner; send it now rather than at the next run.
    if (res.result === 'paid' || res.result === 'failed') void dispatchNotifications(25).catch(() => undefined);
    return res.ok
      ? NextResponse.json({ result: res.result })
      : NextResponse.json({ error: res.error }, { status: res.httpStatus });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Check the withdrawal status before trying again.' }, { status: 500 });
  }
}
