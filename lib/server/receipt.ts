import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { SITE } from '../site';

// ── Auth + data ───────────────────────────────────────────────────────────────

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() || null : null;
}

/** A Supabase client that acts as the caller, so row-level security still applies. */
export function clientForToken(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase is not configured');
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface ReceiptData {
  orderId: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customerId: string | null;
  dropshipperId: string;
  customerName: string;
  customerPhone: string;
  region: string;
  city: string;
  gps: string;
  storeName: string;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  receiptEmailedAt: string | null;
  items: { name: string; quantity: number; unitPrice: number; amount: number }[];
}

export interface ReceiptAccess {
  user: User;
  role: string;
  data: ReceiptData;
}

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string;
  created_at: string;
  customer_id: string | null;
  dropshipper_id: string;
  customer_name: string;
  customer_phone: string;
  customer_region: string | null;
  customer_city: string | null;
  customer_ghana_post_gps: string | null;
  subtotal: number | string;
  platform_fee: number | string | null;
  delivery_fee: number | string | null;
  total: number | string;
  delivery_min_days: number | null;
  delivery_max_days: number | null;
  receipt_emailed_at: string | null;
  dropshipper_profiles?: { store_name: string | null } | null;
  order_items?: {
    quantity: number;
    unit_price: number | string;
    subtotal: number | string;
    products?: { name: string } | null;
  }[];
};

/**
 * Loads an order for a receipt if the caller may see it: the customer who
 * placed it, the store that sold it, or an admin. Suppliers are excluded
 * because they only see their own items, which would make the totals wrong.
 */
export async function loadReceipt(
  supabase: SupabaseClient,
  token: string,
  orderId: string,
): Promise<{ ok: true; access: ReceiptAccess } | { ok: false; status: number; error: string }> {
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) return { ok: false, status: 401, error: 'Please sign in.' };
  const user = userData.user;

  const { data: row, error } = await supabase
    .from('orders')
    .select(
      '*, dropshipper_profiles(store_name), order_items(quantity, unit_price, subtotal, products(name))',
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error || !row) return { ok: false, status: 404, error: 'Order not found.' };
  const o = row as OrderRow;

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  const role = (me as { role?: string } | null)?.role ?? 'customer';
  const allowed = role === 'admin' || o.customer_id === user.id || o.dropshipper_id === user.id;
  if (!allowed) return { ok: false, status: 404, error: 'Order not found.' };

  return {
    ok: true,
    access: {
      user,
      role,
      data: {
        orderId: o.id,
        orderNumber: o.order_number ?? o.id.slice(0, 8).toUpperCase(),
        status: o.status,
        createdAt: o.created_at,
        customerId: o.customer_id,
        dropshipperId: o.dropshipper_id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        region: o.customer_region ?? '',
        city: o.customer_city ?? '',
        gps: o.customer_ghana_post_gps ?? '',
        storeName: o.dropshipper_profiles?.store_name ?? '',
        subtotal: Number(o.subtotal),
        serviceFee: Number(o.platform_fee ?? 0),
        deliveryFee: Number(o.delivery_fee ?? 0),
        total: Number(o.total),
        deliveryMinDays: o.delivery_min_days,
        deliveryMaxDays: o.delivery_max_days,
        receiptEmailedAt: o.receipt_emailed_at,
        items: (o.order_items ?? []).map((it) => ({
          name: it.products?.name ?? 'Product',
          quantity: it.quantity,
          unitPrice: Number(it.unit_price),
          amount: Number(it.subtotal),
        })),
      },
    },
  };
}

// ── PDF ───────────────────────────────────────────────────────────────────────

const INK = rgb(0.082, 0.082, 0.082); // #151515
const RED = rgb(0.941, 0.267, 0.22); // #f04438
const GREY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.93, 0.93, 0.93);

const money = (n: number) => `GHS ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Standard PDF fonts can't draw every character (for example Twi ɛ and ɔ), so map or drop them. */
function safe(text: string, font: PDFFont): string {
  const mapped = text
    .replace(/[ɛƐ]/g, 'e')
    .replace(/[ɔƆ]/g, 'o')
    .replace(/[ŋŊ]/g, 'n')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
  let out = '';
  for (const ch of mapped) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += '?';
    }
  }
  return out;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export async function buildReceiptPdf(d: ReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Receipt ${d.orderNumber}`);
  pdf.setAuthor(SITE.name);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595;
  const H = 842;
  const M = 44;
  let page: PDFPage = pdf.addPage([W, H]);

  const text = (t: string, x: number, y: number, size = 10, font = regular, color = INK) =>
    page.drawText(safe(t, font), { x, y, size, font, color });
  const right = (t: string, xRight: number, y: number, size = 10, font = regular, color = INK) => {
    const s = safe(t, font);
    page.drawText(s, { x: xRight - font.widthOfTextAtSize(s, size), y, size, font, color });
  };

  // Header band
  page.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: INK });
  const brandA = 'Localdropshipping';
  text(brandA, M, H - 52, 20, bold, rgb(1, 1, 1));
  text('gh', M + bold.widthOfTextAtSize(brandA, 20), H - 52, 20, bold, RED);
  right('RECEIPT', W - M, H - 46, 16, bold, rgb(1, 1, 1));
  right(d.orderNumber, W - M, H - 64, 11, regular, rgb(0.8, 0.8, 0.8));

  // Order details
  let y = H - 128;
  const placed = new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  text('DELIVER TO', M, y, 8, bold, GREY);
  text('ORDER', 330, y, 8, bold, GREY);
  y -= 16;
  text(d.customerName, M, y, 11, bold);
  text(`Order no: ${d.orderNumber}`, 330, y, 10);
  y -= 14;
  text(d.customerPhone, M, y, 10);
  text(`Date: ${placed}`, 330, y, 10);
  y -= 14;
  text([d.city, d.region].filter(Boolean).join(', '), M, y, 10);
  if (d.storeName) text(`Store: ${d.storeName}`, 330, y, 10);
  y -= 14;
  if (d.gps) text(`GhanaPost GPS: ${d.gps}`, M, y, 10);
  text(`Status: ${d.status.charAt(0).toUpperCase()}${d.status.slice(1)}`, 330, y, 10);
  y -= 30;

  // Items table
  const colQty = 350;
  const colUnit = 440;
  const colAmt = W - M;
  const header = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: INK });
    text('ITEM', M + 8, y, 8, bold, rgb(1, 1, 1));
    right('QTY', colQty, y, 8, bold, rgb(1, 1, 1));
    right('UNIT PRICE', colUnit + 20, y, 8, bold, rgb(1, 1, 1));
    right('AMOUNT', colAmt - 8, y, 8, bold, rgb(1, 1, 1));
    y -= 26;
  };
  header();

  for (const it of d.items) {
    const lines = wrap(it.name, regular, 10, colQty - M - 60);
    const rowH = lines.length * 13 + 8;
    if (y - rowH < 190) {
      page = pdf.addPage([W, H]);
      y = H - M - 10;
      header();
    }
    lines.forEach((ln, i) => text(ln, M + 8, y - i * 13, 10));
    right(String(it.quantity), colQty, y, 10);
    right(money(it.unitPrice), colUnit + 20, y, 10);
    right(money(it.amount), colAmt - 8, y, 10);
    y -= rowH;
    page.drawLine({ start: { x: M, y: y + 14 }, end: { x: W - M, y: y + 14 }, thickness: 0.5, color: LIGHT });
  }

  // Totals
  if (y < 200) {
    page = pdf.addPage([W, H]);
    y = H - M - 10;
  }
  y -= 14;
  const totalRow = (label: string, value: string, strong = false) => {
    text(label, 330, y, strong ? 12 : 10, strong ? bold : regular, strong ? INK : GREY);
    right(value, colAmt - 8, y, strong ? 12 : 10, strong ? bold : regular, strong ? RED : INK);
    y -= strong ? 22 : 16;
  };
  totalRow('Items subtotal', money(d.subtotal));
  totalRow('Service fee', money(d.serviceFee));
  totalRow('Delivery', money(d.deliveryFee));
  page.drawLine({ start: { x: 330, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 1, color: INK });
  y -= 4;
  totalRow('Total', money(d.total), true);

  if (d.deliveryMinDays != null && d.deliveryMaxDays != null) {
    const eta = d.deliveryMinDays === d.deliveryMaxDays
      ? `${d.deliveryMaxDays} business day${d.deliveryMaxDays === 1 ? '' : 's'}`
      : `${d.deliveryMinDays}-${d.deliveryMaxDays} business days`;
    y -= 6;
    text(`Estimated delivery: about ${eta} after your order ships.`, M, y, 9, regular, GREY);
  }

  // Footer on every page
  for (const p of pdf.getPages()) {
    p.drawLine({ start: { x: M, y: 70 }, end: { x: W - M, y: 70 }, thickness: 0.5, color: LIGHT });
    p.drawText(safe(`${SITE.name}  |  ${SITE.phones.join('  /  ')}  |  ${SITE.location}`, regular), {
      x: M, y: 54, size: 8, font: regular, color: GREY,
    });
    p.drawText(safe('Questions or a problem with this order? Open a ticket at localdropshippinggh.com/support', regular), {
      x: M, y: 42, size: 8, font: regular, color: GREY,
    });
  }

  return pdf.save();
}
