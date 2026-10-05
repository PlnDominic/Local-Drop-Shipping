'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Link2, Phone, TrendingUp, Truck } from 'lucide-react';
import { useToast } from '../components/Toast';
import { getWishlistCounts, joinWishlist, type WishlistRole } from '../lib/supabase/wishlist';

const SITE_URL = 'https://www.localdropshippinggh.com/';

const ROLES: {
  id: WishlistRole;
  label: string;
  tagline: string;
  points: string[];
  icon: typeof TrendingUp;
}[] = [
  {
    id: 'dropshipper',
    label: 'Dropshipper',
    tagline: 'Sell online without buying stock',
    points: [
      'Pick products from verified Ghanaian suppliers',
      'Set your own prices and keep the margin',
      'Get paid your commission via MTN MoMo',
    ],
    icon: TrendingUp,
  },
  {
    id: 'supplier',
    label: 'Supplier',
    tagline: 'Let resellers sell your products',
    points: [
      'List your wholesale products once',
      'Get orders from dropshippers across all 16 regions',
      'Deliver with GhanaPost GPS addresses, get paid per order',
    ],
    icon: Truck,
  },
];

const inputClass =
  'w-full h-12 rounded border border-gray-200 px-3 text-[14px] bg-white focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

export function Wishlist() {
  const { showToast } = useToast();

  const [role, setRole] = useState<WishlistRole>('dropshipper');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState<{ role: WishlistRole; isNew: boolean } | null>(null);
  const [counts, setCounts] = useState<Record<WishlistRole, number> | null>(null);

  useEffect(() => {
    getWishlistCounts().then(setCounts).catch(() => setCounts(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isNew = await joinWishlist(email.trim(), role, name.trim());
      setJoined({ role, isNew });
      if (isNew) setCounts((c) => (c ? { ...c, [role]: c[role] + 1 } : c));
    } catch {
      showToast('Could not add you right now. Please check your email and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const shareWhatsApp = () =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `Local Drop Shipping GH is launching soon — dropship or supply products across Ghana. Join the wishlist: ${SITE_URL}`,
      )}`,
      '_blank',
      'noopener',
    );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      showToast('Link copied!', 'success');
    } catch {
      showToast(SITE_URL, 'info');
    }
  };

  const total = counts ? counts.dropshipper + counts.supplier : 0;
  const activeRole = ROLES.find((r) => r.id === role)!;

  return (
    <div className="min-h-screen bg-[#151515] text-white font-sans relative overflow-hidden">
      <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#f04438]/20 blur-3xl" />
      <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-[#f04438]/10 blur-3xl" />

      {/* ── Header ── */}
      <header className="relative max-w-[1180px] mx-auto px-4 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center bg-[#f04438] font-black text-white text-[13px]">LD</div>
          <span className="font-black text-[15px] sm:text-lg tracking-tight">
            Local Drop Shipping <span className="text-[#f04438]">GH</span>
          </span>
        </div>
        <a href="tel:+233556609232" className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-white">
          <Phone size={13} /> +233 55 660 9232
        </a>
      </header>

      <main className="relative max-w-[1180px] mx-auto px-4 pt-6 pb-16 sm:pt-12 grid gap-8 lg:gap-x-10 lg:gap-y-6 lg:grid-cols-[1.1fr_1fr] items-start">
        {/* ── Pitch ── */}
        <section className="space-y-6 lg:col-start-1 lg:row-start-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#f04438]/40 bg-[#f04438]/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#f04438]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f04438] animate-pulse" /> Launching soon
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05]">
            Sell more.<br />Stock less.<br /><span className="text-[#f04438]">Grow faster.</span>
          </h1>
          <p className="text-gray-400 text-[15px] max-w-lg">
            Ghana&apos;s local dropshipping platform is almost here. Join the wishlist as a dropshipper or supplier
            and we&apos;ll email you an invite to create your account the day we open.
          </p>
        </section>

        {/* ── Signup ── */}
        <section className="lg:col-start-2 lg:row-start-1 lg:row-span-2 rounded bg-white text-[#151515] p-6 sm:p-8 shadow-2xl">
          {joined ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 size={44} className="mx-auto text-[#f04438]" />
              <h2 className="text-[22px] font-black">
                {joined.isNew ? "You're on the wishlist!" : "You're already on the wishlist"}
              </h2>
              <p className="text-[13px] text-[#666] max-w-sm mx-auto">
                We&apos;ll email you an invite to create your {joined.role} account as soon as we launch.
                Know someone who should join? Share it with them.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="h-11 px-5 rounded bg-[#151515] text-[13px] font-black text-white hover:bg-[#f04438] transition-colors"
                >
                  Share on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label="Copy link"
                  className="h-11 w-11 grid place-items-center rounded border border-gray-200 hover:border-[#f04438] hover:text-[#f04438] transition-colors"
                >
                  <Link2 size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setJoined(null); setEmail(''); setName(''); }}
                className="text-[12px] font-bold text-[#999] hover:text-[#151515]"
              >
                Add another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-[22px] font-black">Join the wishlist</h2>
                <p className="text-[13px] text-[#888] mt-1">Get early access when we launch. It&apos;s free.</p>
              </div>

              <div>
                <label className={labelClass}>I want to join as a</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const active = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        aria-pressed={active}
                        className={`flex flex-col items-center gap-1 rounded border px-2 py-4 transition-colors ${
                          active ? 'border-[#f04438] bg-[#f04438]/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={20} className={active ? 'text-[#f04438]' : 'text-[#999]'} />
                        <span className={`text-[13px] font-black ${active ? 'text-[#151515]' : 'text-[#777]'}`}>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[12px] text-[#999] mt-1.5">{activeRole.tagline}</p>
              </div>

              <div>
                <label className={labelClass} htmlFor="wl-email">Email</label>
                <input
                  id="wl-email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="wl-name">
                  Name <span className="normal-case font-semibold">(optional)</span>
                </label>
                <input
                  id="wl-name"
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kofi Owusu"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded bg-[#f04438] text-[14px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {submitting ? 'Joining…' : `Join as a ${activeRole.label}`}
                {!submitting && <ArrowRight size={16} />}
              </button>
              <p className="text-[11px] text-[#999] text-center">
                We&apos;ll only use your email to invite you to create your account. No spam.
              </p>
            </form>
          )}
        </section>
        <section className="space-y-6 lg:col-start-1 lg:row-start-2">
          <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.id} className="rounded border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-[#f04438]" />
                    <p className="font-black text-[14px]">{r.label}s</p>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {r.points.map((pt) => (
                      <li key={pt} className="flex gap-2 text-[12px] text-gray-400">
                        <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-[#f04438]" /> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {counts && total > 0 && (
            <p className="text-[13px] text-gray-400">
              <span className="font-black text-white">{total.toLocaleString()}</span> already on the wishlist
              {' '}({counts.dropshipper.toLocaleString()} dropshippers, {counts.supplier.toLocaleString()} suppliers)
            </p>
          )}
        </section>

      </main>

      <footer className="relative border-t border-white/10">
        <div className="max-w-[1180px] mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-gray-500">
          <span>© {new Date().getFullYear()} Local Drop Shipping GH</span>
          <span className="inline-flex items-center gap-3">
            <a href="tel:+233556609232" className="hover:text-white">+233 55 660 9232</a>
            <a href="tel:+233542855399" className="hover:text-white">+233 54 285 5399</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
