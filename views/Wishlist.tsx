'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Link2, TrendingUp, Truck } from 'lucide-react';
import { useToast } from '../components/Toast';
import { getWishlistCounts, joinWishlist, type WishlistRole } from '../lib/supabase/wishlist';

const SITE_URL = 'https://www.localdropshippinggh.com/';

/** Optional ISO date (e.g. 2026-12-01T09:00:00Z). The countdown only shows when this is set. */
const LAUNCH_DATE = process.env.NEXT_PUBLIC_LAUNCH_DATE;

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

const NAV = [
  { id: 'join', label: 'Join', desktopOnly: true },
  { id: 'dropshippers', label: 'Dropshippers' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'contact', label: 'Contact', desktopOnly: true },
];

/** Soft 3D ribbons behind the card in the brand's black, red and white. */
const Ribbons: React.FC = () => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[520px] w-full"
    viewBox="0 0 1440 520"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="rb-dark" x1="0" x2="1">
        <stop offset="0" stopColor="#151515" />
        <stop offset="0.55" stopColor="#151515" stopOpacity="0.55" />
        <stop offset="1" stopColor="#151515" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="rb-red" x1="0" x2="1">
        <stop offset="0" stopColor="#f04438" />
        <stop offset="0.6" stopColor="#f04438" stopOpacity="0.6" />
        <stop offset="1" stopColor="#f04438" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="rb-light" x1="1" x2="0">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.7" stopColor="#ffffff" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <filter id="rb-shadow" x="-10%" y="-30%" width="120%" height="180%">
        <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000000" floodOpacity="0.25" />
      </filter>
    </defs>
    <g fill="none" strokeLinecap="round" filter="url(#rb-shadow)">
      <path d="M-40 330 C 260 250, 520 215, 760 235" stroke="url(#rb-dark)" strokeWidth="64" />
      <path d="M-40 410 C 280 330, 540 290, 780 305" stroke="url(#rb-red)" strokeWidth="42" />
      <path d="M-40 470 C 300 400, 560 360, 800 372" stroke="url(#rb-dark)" strokeWidth="30" opacity="0.7" />
      <path d="M1480 190 C 1200 160, 980 190, 700 250" stroke="url(#rb-light)" strokeWidth="58" />
      <path d="M1480 285 C 1200 250, 980 285, 720 330" stroke="url(#rb-light)" strokeWidth="40" opacity="0.9" />
      <path d="M1480 360 C 1220 330, 1000 355, 740 395" stroke="url(#rb-red)" strokeWidth="18" opacity="0.5" />
    </g>
  </svg>
);

const useCountdown = () => {
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const target = LAUNCH_DATE ? new Date(LAUNCH_DATE).getTime() : NaN;
    if (Number.isNaN(target)) return;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff / 3600000) % 24),
        m: Math.floor((diff / 60000) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return left;
};

export function Wishlist() {
  const { showToast } = useToast();

  const [role, setRole] = useState<WishlistRole>('dropshipper');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState<{ role: WishlistRole; isNew: boolean } | null>(null);
  const [counts, setCounts] = useState<Record<WishlistRole, number> | null>(null);
  const [active, setActive] = useState('join');
  const countdown = useCountdown();

  useEffect(() => {
    getWishlistCounts().then(setCounts).catch(() => setCounts(null));
  }, []);

  // Highlight the nav pill for the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { threshold: [0.35, 0.6] },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isNew = await joinWishlist(email.trim(), role, '');
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
        `Local Drop Shipping GH is launching soon — dropship or supply products across Ghana. Join the waitlist: ${SITE_URL}`,
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
    <div className="min-h-screen bg-white text-[#151515] font-sans relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(240,68,56,0.12),transparent),radial-gradient(35%_35%_at_0%_100%,rgba(240,68,56,0.07),transparent)]" />

      {/* ── Floating pill nav ── */}
      <nav className="fixed top-4 inset-x-0 z-30 flex justify-center px-3" aria-label="Page sections">
        <div className="flex max-w-full items-center gap-1 rounded-full bg-white/80 backdrop-blur-xl px-2 py-2 shadow-[0_10px_40px_-10px_rgba(21,21,21,0.25)] border border-white/70">
          <a href="#join" className="pl-3 pr-2 sm:px-4 text-[13px] sm:text-[15px] font-black tracking-tight whitespace-nowrap">
            Localdropshipping<span className="text-[#f04438]">gh</span>
          </a>
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                aria-current={active === n.id ? 'true' : undefined}
                className={`${n.desktopOnly ? 'hidden sm:block' : ''} rounded-full px-3 sm:px-4 py-1.5 text-[12px] sm:text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  active === n.id ? 'bg-[#151515] text-white' : 'text-[#666] hover:text-[#151515]'
                }`}
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero: ribbons + glass card ── */}
      <section id="join" className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-16">
        <Ribbons />

        <div className="relative w-full max-w-[620px] rounded-[28px] border border-white bg-white/70 backdrop-blur-2xl px-6 py-9 sm:px-12 sm:py-11 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.45)] ring-1 ring-black/5">
          {joined ? (
            <div className="text-center space-y-4 py-2">
              <CheckCircle2 size={44} className="mx-auto text-[#f04438]" />
              <h2 className="text-[26px] font-light leading-tight">
                {joined.isNew ? "You're on the waitlist" : "You're already on the list"}
              </h2>
              <p className="text-[14px] text-[#666]">
                We&apos;ll email you an invite to create your {joined.role} account the day we launch. Know someone
                who should join?
              </p>
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="h-11 px-5 rounded-xl bg-[#f04438] text-[13px] font-bold text-white hover:bg-[#c0392b] transition-colors"
                >
                  Share on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label="Copy link"
                  className="h-11 w-11 grid place-items-center rounded-xl border border-gray-200 bg-white/70 hover:border-[#f04438] hover:text-[#f04438] transition-colors"
                >
                  <Link2 size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setJoined(null); setEmail(''); }}
                className="text-[12px] font-semibold text-[#999] hover:text-[#151515]"
              >
                Add another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="text-center">
              <h1 className="text-[30px] sm:text-[42px] font-light leading-tight tracking-tight">Join the waitlist</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#555]">
                Get early access to Local Drop Shipping GH, Ghana&apos;s platform for dropshippers and local suppliers.
              </p>

              <div
                role="group"
                aria-label="I want to join as a"
                className="mt-6 mx-auto grid grid-cols-2 gap-1 rounded-xl bg-white p-1 border border-black/10"
              >
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const on = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setRole(r.id)}
                      className={`h-10 rounded-lg flex items-center justify-center gap-1.5 text-[13px] font-bold transition-colors ${
                        on ? 'bg-[#151515] text-white shadow-sm' : 'text-[#777] hover:text-[#151515]'
                      }`}
                    >
                      <Icon size={14} /> {r.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] text-[#888]">{activeRole.tagline}</p>

              <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full sm:flex-1 min-w-0 rounded-xl border border-black/10 bg-white px-4 text-[14px] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#f04438]/40"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 rounded-xl bg-[#f04438] px-6 text-[14px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(240,68,56,0.8)] hover:bg-[#c0392b] transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Joining…' : 'Sign Up'}
                  {!submitting && <ArrowRight size={15} />}
                </button>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2.5 text-[13px] text-[#555]">
                <span className="flex -space-x-2" aria-hidden="true">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f04438] text-white ring-2 ring-white"><TrendingUp size={13} /></span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#151515] text-white ring-2 ring-white"><Truck size={13} /></span>
                </span>
                <span>
                  {total > 0 ? (
                    <><strong className="font-black text-[#151515]">{total.toLocaleString()}</strong> already on the waitlist</>
                  ) : (
                    'Be among the first to join'
                  )}
                </span>
              </div>

              {countdown && (
                <div className="mt-6 flex items-center justify-center text-center" aria-label="Time until launch">
                  {[
                    ['Days', countdown.d],
                    ['Hours', countdown.h],
                    ['Minutes', countdown.m],
                    ['Seconds', countdown.s],
                  ].map(([label, value], i) => (
                    <React.Fragment key={label as string}>
                      {i > 0 && <span className="mx-3 sm:mx-4 h-5 w-px bg-[#151515]/20" />}
                      <div>
                        <p className="text-[22px] sm:text-[26px] font-light tabular-nums leading-none">
                          {String(value).padStart(2, '0')}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-[#888]">{label}</p>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}

              <p className="mt-5 text-[11px] text-[#999]">We&apos;ll only use your email to invite you. No spam.</p>
            </form>
          )}
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="relative max-w-[980px] mx-auto px-4 pb-20 grid gap-4 sm:grid-cols-2">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              id={`${r.id}s`}
              className="scroll-mt-24 rounded-[24px] border border-black/5 bg-white p-6 sm:p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f04438] text-white">
                <Icon size={18} />
              </span>
              <h2 className="mt-4 text-[22px] font-light">For {r.label.toLowerCase()}s</h2>
              <p className="text-[13px] text-[#888] mt-0.5">{r.tagline}</p>
              <ul className="mt-4 space-y-2.5">
                {r.points.map((pt) => (
                  <li key={pt} className="flex gap-2.5 text-[14px] text-[#444]">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[#f04438]" /> {pt}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setRole(r.id);
                  setJoined(null);
                  document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#f04438] hover:underline"
              >
                Join as a {r.label.toLowerCase()} <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="relative border-t border-black/10 bg-[#151515] text-white scroll-mt-24">
        <div className="max-w-[980px] mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-[13px] text-gray-400">
          <span>© {new Date().getFullYear()} Local Drop Shipping GH · Accra, Ghana</span>
          <span className="inline-flex items-center gap-4 font-semibold">
            <a href="/terms" className="hover:text-[#f04438]">Terms</a>
            <a href="/privacy" className="hover:text-[#f04438]">Privacy</a>
          </span>
          <span className="inline-flex items-center gap-4 font-semibold">
            <a href="tel:+233556609232" className="hover:text-[#f04438]">+233 55 660 9232</a>
            <a href="tel:+233542855399" className="hover:text-[#f04438]">+233 54 285 5399</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
