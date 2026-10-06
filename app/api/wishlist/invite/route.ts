import { NextResponse } from 'next/server';
import { SITE } from '../../../../lib/site';
import { bearerToken, clientForToken } from '../../../../lib/server/receipt';
import { escapeHtml, sendHtmlEmail } from '../../../../lib/server/notify/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PER_CALL = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROLE_COPY = {
  dropshipper: { what: 'start selling', line: 'Pick products from verified Ghanaian suppliers, set your own prices and earn a commission on every sale, paid to MTN MoMo.' },
  supplier: { what: 'start supplying', line: 'List your products, reach dropshippers across Ghana and get paid for every order we route to you.' },
} as const;

function inviteHtml(name: string, role: keyof typeof ROLE_COPY, link: string): string {
  const copy = ROLE_COPY[role];
  return `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;color:#151515">
    <div style="background:#151515;padding:18px 24px"><span style="color:#fff;font-size:20px;font-weight:bold">Localdropshipping<span style="color:#f04438">gh</span></span></div>
    <div style="padding:26px 24px">
      <h2 style="margin:0 0 10px">${name ? `${escapeHtml(name)}, we` : 'We'}&rsquo;re live!</h2>
      <p style="margin:0 0 14px;color:#444;line-height:1.55">You joined our waitlist, and your spot is ready. You can now ${copy.what} on Localdropshippinggh. ${copy.line}</p>
      <p style="margin:22px 0"><a href="${link}" style="background:#f04438;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold">Create my account</a></p>
      <p style="margin:0;font-size:12px;color:#999">Or paste this link into your browser: ${link}<br/>You received this because you asked to be notified at launch.</p>
    </div></div>`;
}

/**
 * POST /api/wishlist/invite  { ids: string[] }  (admin only)
 * Emails a sign-up invite to up to 25 waitlist entries per call, skips people who already
 * joined, and records which invites went out. The admin page calls this in batches.
 */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!process.env.RESEND_API_KEY || !process.env.RECEIPT_FROM_EMAIL) {
    return NextResponse.json({ error: 'Email is not configured. Set RESEND_API_KEY and RECEIPT_FROM_EMAIL.' }, { status: 501 });
  }

  let ids: string[] = [];
  try {
    const body = (await req.json()) as { ids?: unknown };
    ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === 'string' && UUID.test(v)) : [];
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  if (ids.length === 0 || ids.length > MAX_PER_CALL) {
    return NextResponse.json({ error: `Send between 1 and ${MAX_PER_CALL} invites at a time.` }, { status: 400 });
  }

  try {
    const sb = clientForToken(token);
    const { data: auth } = await sb.auth.getUser(token);
    if (!auth.user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const { data: me } = await sb.from('users').select('role').eq('id', auth.user.id).maybeSingle();
    if ((me as { role?: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can send invites.' }, { status: 403 });
    }

    const { data: rows, error } = await sb
      .from('wishlist_signups')
      .select('id, email, role, full_name, joined_at')
      .in('id', ids);
    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    const failed: string[] = [];
    const sentIds: string[] = [];

    for (const r of (rows ?? []) as { id: string; email: string; role: keyof typeof ROLE_COPY; full_name: string; joined_at: string | null }[]) {
      if (r.joined_at) { skipped += 1; continue; }
      const link = `${SITE.url}/login?mode=signup&role=${r.role}&email=${encodeURIComponent(r.email)}`;
      const result = await sendHtmlEmail(r.email, "You're in: Localdropshippinggh is live", inviteHtml(r.full_name, r.role, link));
      if (result.ok) { sent += 1; sentIds.push(r.id); } else failed.push(r.email);
    }

    if (sentIds.length) await sb.rpc('mark_wishlist_invites_sent', { p_ids: sentIds });
    return NextResponse.json({ sent, skipped, failed, sentIds });
  } catch {
    return NextResponse.json({ error: 'Could not send invites.' }, { status: 500 });
  }
}
