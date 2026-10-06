import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CODE = /^[a-z0-9]{6,12}$/i;
// Link-preview robots fetch the URL when someone pastes it into a chat. They are not customers.
const CRAWLER = /bot|crawl|spider|whatsapp|facebookexternalhit|facebot|twitter|slack|telegram|preview|embedly|linkedin/i;

/** GET /s/:code: counts the visit, then sends the visitor to the shared product or store. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = new URL(req.url).origin;
  const home = NextResponse.redirect(new URL('/marketplace', origin), 302);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !CODE.test(code)) return home;

  try {
    const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const isCrawler = CRAWLER.test(req.headers.get('user-agent') ?? '');
    const { data } = await sb.rpc('resolve_share_link', { p_code: code, p_count: !isCrawler });
    const link = data as { ownerId: string; storeSlug: string; productId: string | null } | null;
    if (!link) return home;

    let path = `/store/${link.storeSlug}`;
    if (link.productId) {
      const { data: dp } = await sb
        .from('dropshipper_products')
        .select('id')
        .eq('dropshipper_id', link.ownerId)
        .eq('product_id', link.productId)
        .eq('is_published', true)
        .maybeSingle();
      if (dp) path = `/product/${(dp as { id: string }).id}`;
    }
    return NextResponse.redirect(new URL(`${path}?ref=${encodeURIComponent(code)}`, origin), 302);
  } catch {
    return home;
  }
}
