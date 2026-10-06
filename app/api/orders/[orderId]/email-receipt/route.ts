import { NextResponse } from 'next/server';
import { SITE } from '../../../../../lib/site';
import { bearerToken, buildReceiptPdf, clientForToken, loadReceipt } from '../../../../../lib/server/receipt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * POST /api/orders/:orderId/email-receipt
 * Emails the receipt PDF to the customer, once per order. Needs RESEND_API_KEY and
 * RECEIPT_FROM_EMAIL (a sender on a domain verified with Resend). When those are not
 * set the route answers 501 and the app carries on; receipts can still be downloaded.
 */
export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json({ sent: false, reason: 'Email is not configured.' }, { status: 501 });
  }

  try {
    const supabase = clientForToken(token);
    const result = await loadReceipt(supabase, token, orderId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    const { user, role, data } = result.access;

    if (data.receiptEmailedAt) return NextResponse.json({ sent: false, reason: 'Already sent.' });

    // Customers get their own receipt; an admin re-sending goes to the customer on file.
    let to = user.email ?? '';
    if (data.customerId && data.customerId !== user.id) {
      if (role !== 'admin') return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
      const { data: customer } = await supabase.from('users').select('email').eq('id', data.customerId).maybeSingle();
      to = (customer as { email?: string } | null)?.email ?? '';
    }
    if (!to) return NextResponse.json({ sent: false, reason: 'No email address on file.' }, { status: 422 });

    const pdf = await buildReceiptPdf(data);
    const rows = data.items
      .map((i) => `<tr><td style="padding:6px 0">${escapeHtml(i.name)} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">GHS ${i.amount.toFixed(2)}</td></tr>`)
      .join('');
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#151515">
      <div style="background:#151515;padding:20px 24px"><span style="color:#fff;font-size:20px;font-weight:bold">Localdropshipping<span style="color:#f04438">gh</span></span></div>
      <div style="padding:24px">
        <h2 style="margin:0 0 8px">Thanks for your order, ${escapeHtml(data.customerName)}!</h2>
        <p style="margin:0 0 16px;color:#555">Order <strong>${escapeHtml(data.orderNumber)}</strong> has been received. Your receipt is attached as a PDF.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
          <tr><td style="padding:6px 0;color:#777">Service fee</td><td style="text-align:right">GHS ${data.serviceFee.toFixed(2)}</td></tr>
          <tr><td style="padding:6px 0;color:#777">Delivery</td><td style="text-align:right">GHS ${data.deliveryFee.toFixed(2)}</td></tr>
          <tr><td style="padding:10px 0;border-top:2px solid #151515;font-weight:bold">Total</td><td style="padding:10px 0;border-top:2px solid #151515;text-align:right;font-weight:bold;color:#f04438">GHS ${data.total.toFixed(2)}</td></tr>
        </table>
        <p style="margin:20px 0 0"><a href="${SITE.url}/orders" style="background:#f04438;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-weight:bold">Track your order</a></p>
        <p style="margin:20px 0 0;font-size:12px;color:#999">Need help? Reply here or open a ticket at ${SITE.url}/support</p>
      </div></div>`;

    const resp = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Your receipt for order ${data.orderNumber}`,
        html,
        attachments: [{ filename: `receipt-${data.orderNumber}.pdf`, content: Buffer.from(pdf).toString('base64') }],
      }),
    });
    if (!resp.ok) return NextResponse.json({ sent: false, reason: 'The email service rejected the message.' }, { status: 502 });

    await supabase.rpc('mark_receipt_emailed', { p_order_id: orderId });
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ sent: false, reason: 'Could not send the receipt.' }, { status: 500 });
  }
}
