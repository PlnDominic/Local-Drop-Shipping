import { NextResponse } from 'next/server';
import { bearerToken, buildReceiptPdf, clientForToken, loadReceipt } from '../../../../lib/server/receipt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/receipts/:orderId  (Authorization: Bearer <access token>) -> receipt PDF */
export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  try {
    const result = await loadReceipt(clientForToken(token), token, orderId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    const pdf = await buildReceiptPdf(result.access.data);
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${result.access.data.orderNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not create the receipt right now.' }, { status: 500 });
  }
}
