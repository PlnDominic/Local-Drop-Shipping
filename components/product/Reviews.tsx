'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Star } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../Toast';
import type { PageReview } from '../../lib/server/catalog';

export const Stars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
  <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={size} fill={n <= Math.round(rating) ? '#f5a524' : 'none'} stroke={n <= Math.round(rating) ? '#f5a524' : '#ccc'} strokeWidth={1.5} />
    ))}
  </span>
);

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Verified-buyer reviews, plus a form for customers whose order of this product was delivered. */
export const Reviews: React.FC<{
  productId: string;
  rating: { average: number; count: number };
  reviews: PageReview[];
}> = ({ productId, rating, reviews }) => {
  const router = useRouter();
  const { session } = useAuth();
  const { showToast } = useToast();

  const [canReview, setCanReview] = useState(false);
  const [stars, setStars] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session) { setCanReview(false); return; }
    let live = true;
    void (async () => {
      const [elig, mine] = await Promise.all([
        supabase.rpc('can_review_product', { p_product_id: productId }),
        supabase.from('reviews').select('rating, title, body').eq('product_id', productId).eq('user_id', session.user.id).maybeSingle(),
      ]);
      if (!live) return;
      setCanReview(elig.data === true);
      const own = mine.data as { rating: number; title: string; body: string } | null;
      if (own) { setStars(own.rating); setTitle(own.title); setBody(own.body); }
    })();
    return () => { live = false; };
  }, [session, productId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (stars < 1) { setError('Choose a star rating first.'); return; }
    setBusy(true);
    const { error: err } = await supabase.rpc('submit_review', { p_product_id: productId, p_rating: stars, p_title: title, p_body: body });
    setBusy(false);
    if (err) { setError(err.message); return; }
    showToast('Thanks for your review!', 'success');
    setOpen(false);
    router.refresh();
  };

  return (
    <section className="mt-8 rounded border border-gray-100 bg-white p-5" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="reviews-heading" className="text-[16px] font-black text-[#151515]">Customer reviews</h2>
          {rating.count > 0 ? (
            <p className="mt-1 flex items-center gap-2 text-[13px] text-[#555]">
              <Stars rating={rating.average} />
              <strong className="text-[#151515]">{rating.average.toFixed(1)}</strong> from {rating.count} verified {rating.count === 1 ? 'buyer' : 'buyers'}
            </p>
          ) : (
            <p className="mt-1 text-[13px] text-[#777]">No reviews yet. Only customers who received this product can review it.</p>
          )}
        </div>
        {canReview && !open && (
          <button type="button" onClick={() => setOpen(true)} className="h-10 rounded bg-[#151515] px-4 text-[12px] font-black text-white hover:bg-[#f04438]">
            {stars > 0 ? 'Edit your review' : 'Write a review'}
          </button>
        )}
        {!session && (
          <Link href="/login" className="text-[12px] font-bold text-[#f04438] hover:underline">Sign in to review a product you received</Link>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded border border-gray-200 p-4">
          <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)}>
                <Star size={26} fill={n <= stars ? '#f5a524' : 'none'} stroke={n <= stars ? '#f5a524' : '#bbb'} strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Headline (optional)" className="w-full h-11 rounded border border-gray-200 px-3 text-[13px] focus:outline-none focus:border-[#f04438]" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} placeholder="What did you think of it?" className="w-full rounded border border-gray-200 p-3 text-[13px] focus:outline-none focus:border-[#f04438]" />
          {error && <p role="alert" className="text-[12px] font-semibold text-[#c0392b]">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="h-10 rounded bg-[#f04438] px-5 text-[12px] font-black text-white disabled:opacity-60">{busy ? 'Saving…' : 'Post review'}</button>
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded border border-gray-200 px-4 text-[12px] font-bold text-[#555]">Cancel</button>
          </div>
        </form>
      )}

      {reviews.length > 0 && (
        <ul className="mt-5 divide-y divide-gray-100">
          {reviews.map((r) => (
            <li key={r.id} className="py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={r.rating} size={13} />
                {r.title && <strong className="text-[13px] text-[#151515]">{r.title}</strong>}
              </div>
              {r.body && <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-[#444]">{r.body}</p>}
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#999]">
                {r.reviewerName} · {day(r.createdAt)}
                <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600"><BadgeCheck size={12} /> Verified buyer</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
