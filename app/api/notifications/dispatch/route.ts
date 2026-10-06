import { NextResponse } from 'next/server';
import { bearerToken, clientForToken } from '../../../../lib/server/receipt';
import { dispatchNotifications, serviceClient } from '../../../../lib/server/notify/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sends queued order and stock alerts. Callers:
 *  - the app, right after an order or status change (any signed-in user; it only sends
 *    what is already queued, so it cannot be used to message arbitrary people)
 *  - a scheduler, with `Authorization: Bearer $CRON_SECRET`, to retry failures
 */
async function handle(req: Request) {
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const cron = process.env.CRON_SECRET;
  let allowed = Boolean(cron) && token === cron;
  if (!allowed) {
    try {
      const { data } = await clientForToken(token).auth.getUser(token);
      allowed = Boolean(data.user);
    } catch {
      allowed = false;
    }
  }
  if (!allowed) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  if (!serviceClient()) {
    return NextResponse.json({ dispatched: false, reason: 'Notifications are not configured.' }, { status: 501 });
  }

  try {
    const summary = await dispatchNotifications(25);
    return NextResponse.json({ dispatched: true, ...summary });
  } catch {
    return NextResponse.json({ dispatched: false, reason: 'Could not send notifications.' }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
