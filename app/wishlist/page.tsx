'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUp,
  CheckCircle2,
  Heart,
  Lightbulb,
  Link2,
  Package,
  Search,
  Send,
  Store,
} from 'lucide-react';
import { SiteHeader } from '../../components/SiteHeader';
import { useToast } from '../../components/Toast';
import {
  getVotedIds,
  getWishes,
  saveVotedIds,
  submitWish,
  toggleWishVote,
  type Wish,
  type WishKind,
  type WishStatus,
} from '../../lib/supabase/wishlist';

const SITE_URL = 'https://www.localdropshippinggh.com/wishlist';

const KINDS: { id: WishKind; label: string; desc: string; placeholder: string; icon: typeof Package }[] = [
  { id: 'product', label: 'Product', desc: 'Something to buy or resell', placeholder: 'e.g. Rechargeable standing fans', icon: Package },
  { id: 'supplier', label: 'Supplier / Brand', desc: 'Who we should partner with', placeholder: 'e.g. Shea butter makers in Tamale', icon: Store },
  { id: 'feature', label: 'Feature', desc: 'Something the platform should do', placeholder: 'e.g. Pay on delivery in Kumasi', icon: Lightbulb },
];

const CATEGORIES = ['Electronics', 'Fashion', 'Beauty', 'Home & Living', 'Health', 'Food & Grocery', 'Baby & Kids', 'Agriculture', 'Other'];

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central', 'Eastern', 'Volta', 'Oti',
  'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
];

const STATUS_STYLES: Record<WishStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-gray-100 text-[#555]' },
  planned: { label: 'Planned', className: 'bg-amber-50 text-amber-700' },
  available: { label: 'Now available', className: 'bg-green-50 text-green-700' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-700' },
};

type Sort = 'top' | 'new';

const inputClass =
  'w-full h-11 rounded border border-gray-200 px-3 text-[13px] bg-white focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-GH');
};

export default function WishlistPage() {
  const { showToast } = useToast();

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [pendingVote, setPendingVote] = useState<string | null>(null);

  const [kindFilter, setKindFilter] = useState<WishKind | 'all'>('all');
  const [sort, setSort] = useState<Sort>('top');
  const [search, setSearch] = useState('');

  const [kind, setKind] = useState<WishKind>('product');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    setVoted(getVotedIds());
    getWishes()
      .then(setWishes)
      .catch(() => setLoadError('We couldn’t load the wishlist right now. Please refresh in a moment.'))
      .finally(() => setLoading(false));
  }, []);

  // Wishes similar to what is being typed, so people upvote instead of duplicating.
  const similar = useMemo(() => {
    const words = title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    if (!words.length) return [];
    return wishes
      .filter((w) => words.some((word) => w.title.toLowerCase().includes(word)))
      .slice(0, 3);
  }, [title, wishes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wishes
      .filter((w) => kindFilter === 'all' || w.kind === kindFilter)
      .filter((w) => !q || `${w.title} ${w.details} ${w.category ?? ''} ${w.region ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === 'top'
          ? b.voteCount - a.voteCount || b.createdAt.localeCompare(a.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
      );
  }, [wishes, kindFilter, search, sort]);

  const totalVotes = wishes.reduce((sum, w) => sum + w.voteCount, 0);

  const handleVote = async (id: string) => {
    if (pendingVote) return;
    setPendingVote(id);
    try {
      const result = await toggleWishVote(id);
      setWishes((prev) => prev.map((w) => (w.id === id ? { ...w, voteCount: result.voteCount } : w)));
      setVoted((prev) => {
        const next = new Set(prev);
        if (result.voted) next.add(id);
        else next.delete(id);
        saveVotedIds(next);
        return next;
      });
    } catch {
      showToast('Could not record your vote. Please try again.', 'error');
    } finally {
      setPendingVote(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      showToast('Please describe your wish in a few words.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const wish = await submitWish({ kind, title, details, category, region, name, contact });
      setWishes((prev) => [wish, ...prev]);
      setVoted((prev) => {
        const next = new Set(prev).add(wish.id);
        saveVotedIds(next);
        return next;
      });
      setTitle('');
      setDetails('');
      setContact('');
      setJustAdded(wish.id);
      setSort('new');
      setKindFilter('all');
      showToast('Your wish has been added. Share it to get more votes!', 'success');
      document.getElementById('wishes')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      const message = err instanceof Error && err.message.includes('recently')
        ? err.message
        : 'Could not add your wish. Please try again.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const shareText = (w?: Wish) =>
    w
      ? `I wish Local Drop Shipping GH had "${w.title}". Vote for it here:`
      : 'What do you wish you could buy or sell in Ghana? Add it to the Local Drop Shipping GH wishlist:';

  const shareWhatsApp = (w?: Wish) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText(w)} ${SITE_URL}`)}`, '_blank', 'noopener');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      showToast('Link copied!', 'success');
    } catch {
      showToast(SITE_URL, 'info');
    }
  };

  const activeKind = KINDS.find((k) => k.id === kind)!;

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="bg-[#151515] text-white relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#f04438]/20 blur-3xl" />
        <div className="relative max-w-[1280px] mx-auto px-4 py-12 sm:py-16 grid gap-8 lg:grid-cols-[1.4fr_1fr] items-end">
          <div className="space-y-4">
            <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Heart size={12} className="fill-[#f04438]" /> Community Wishlist
            </p>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight">
              What do you wish<br />we sold in Ghana?
            </h1>
            <p className="text-gray-400 text-[14px] max-w-xl">
              Add the products, suppliers and features you want on Local Drop Shipping GH. Upvote what
              others want — the most-wanted wishes get sourced first, and we’ll tell you when they land.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <a href="#add" className="h-10 px-5 rounded bg-[#f04438] text-[13px] font-black leading-10 hover:bg-[#c0392b] transition-colors">
                Add a wish
              </a>
              <button
                type="button"
                onClick={() => shareWhatsApp()}
                className="h-10 px-5 rounded border border-white/20 text-[13px] font-black hover:bg-white/10 transition-colors"
              >
                Share on WhatsApp
              </button>
              <button
                type="button"
                onClick={copyLink}
                aria-label="Copy link"
                className="h-10 w-10 grid place-items-center rounded border border-white/20 hover:bg-white/10 transition-colors"
              >
                <Link2 size={15} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-white/10 bg-white/5 p-5">
              <p className="text-3xl font-black">{loading ? '–' : wishes.length}</p>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Wishes</p>
            </div>
            <div className="rounded border border-white/10 bg-white/5 p-5">
              <p className="text-3xl font-black">{loading ? '–' : totalVotes}</p>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Votes</p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-[1280px] mx-auto px-4 py-10 grid gap-8 lg:grid-cols-[380px_1fr] items-start">
        {/* ── Add a wish ── */}
        <form
          id="add"
          onSubmit={handleSubmit}
          className="bg-white border border-gray-100 rounded p-5 space-y-4 lg:sticky lg:top-24 scroll-mt-24"
        >
          <div>
            <h2 className="text-[18px] font-black text-[#151515]">Add your wish</h2>
            <p className="text-[12px] text-[#888] mt-0.5">No account needed. Takes 20 seconds.</p>
          </div>

          <div>
            <label className={labelClass}>I wish you had a</label>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => {
                const Icon = k.icon;
                const active = kind === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKind(k.id)}
                    className={`flex flex-col items-center gap-1 rounded border px-1 py-3 transition-colors ${
                      active ? 'border-[#f04438] bg-[#f04438]/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={17} className={active ? 'text-[#f04438]' : 'text-[#999]'} />
                    <span className={`text-[11px] font-black text-center leading-tight ${active ? 'text-[#151515]' : 'text-[#777]'}`}>{k.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#999] mt-1.5">{activeKind.desc}</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="wish-title">Your wish</label>
            <input
              id="wish-title"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={activeKind.placeholder}
              className={inputClass}
            />
            {similar.length > 0 && (
              <div className="mt-2 rounded bg-[#f7f7f7] border border-gray-200 p-2.5 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#999]">Already wished? Upvote it instead</p>
                {similar.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => !voted.has(w.id) && handleVote(w.id)}
                    className="w-full flex items-center justify-between gap-2 text-left text-[12px] text-[#333] hover:text-[#f04438]"
                  >
                    <span className="truncate">{w.title}</span>
                    <span className={`flex items-center gap-0.5 font-black flex-shrink-0 ${voted.has(w.id) ? 'text-[#f04438]' : ''}`}>
                      <ArrowUp size={12} /> {w.voteCount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="wish-details">Details <span className="normal-case font-semibold">(optional)</span></label>
            <textarea
              id="wish-details"
              maxLength={1000}
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Brand, size, price you'd pay, why you need it…"
              className="w-full rounded border border-gray-200 px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#f04438] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass} htmlFor="wish-category">Category</label>
              <select id="wish-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">Any</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="wish-region">Your region</label>
              <select id="wish-region" value={region} onChange={(e) => setRegion(e.target.value)} className={inputClass}>
                <option value="">Any</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass} htmlFor="wish-name">Name</label>
              <input id="wish-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ama" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="wish-contact">Phone / email</label>
              <input id="wish-contact" maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+233 …" className={inputClass} />
            </div>
          </div>
          <p className="text-[11px] text-[#999] -mt-2">
            Optional. Contact details are private — we only use them to tell you when your wish is available.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded bg-[#151515] text-[13px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add to wishlist'}
            {!submitting && <Send size={14} />}
          </button>
        </form>

        {/* ── Wishes ── */}
        <section id="wishes" className="space-y-4 scroll-mt-24 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 rounded bg-gray-100 p-1 overflow-x-auto">
              {([{ id: 'all', label: 'All' }, ...KINDS] as { id: WishKind | 'all'; label: string }[]).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKindFilter(k.id)}
                  className={`h-8 px-3 rounded text-[12px] font-black whitespace-nowrap transition-colors ${
                    kindFilter === k.id ? 'bg-white text-[#151515] shadow-sm' : 'text-[#777] hover:text-[#151515]'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search wishes"
                  aria-label="Search wishes"
                  className="w-full h-10 rounded border border-gray-200 pl-8 pr-3 text-[12px] bg-white focus:outline-none focus:border-[#f04438]"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sort"
                className="h-10 rounded border border-gray-200 px-2 text-[12px] font-semibold bg-white focus:outline-none"
              >
                <option value="top">Most wanted</option>
                <option value="new">Newest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded bg-white border border-gray-100 animate-pulse" />)}
            </div>
          ) : loadError ? (
            <div className="rounded bg-red-50 px-4 py-3 text-[13px] text-red-700 border border-red-100">{loadError}</div>
          ) : visible.length === 0 ? (
            <div className="rounded bg-white border border-dashed border-gray-200 p-10 text-center">
              <Heart size={28} className="mx-auto text-[#f04438]" />
              <p className="mt-3 font-black text-[#151515]">
                {wishes.length === 0 ? 'Be the first to make a wish' : 'No wishes match your search'}
              </p>
              <p className="text-[12px] text-[#888] mt-1">Tell us what you want to see on Local Drop Shipping GH.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((w, i) => {
                const hasVoted = voted.has(w.id);
                const KindIcon = KINDS.find((k) => k.id === w.kind)?.icon ?? Package;
                const status = STATUS_STYLES[w.status];
                return (
                  <li
                    key={w.id}
                    className={`flex gap-4 rounded bg-white border p-4 transition-colors ${
                      justAdded === w.id ? 'border-[#f04438]' : 'border-gray-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleVote(w.id)}
                      disabled={pendingVote === w.id}
                      aria-pressed={hasVoted}
                      aria-label={hasVoted ? 'Remove vote' : 'Upvote'}
                      className={`flex-shrink-0 w-14 h-16 rounded border flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-60 ${
                        hasVoted
                          ? 'border-[#f04438] bg-[#f04438] text-white'
                          : 'border-gray-200 text-[#555] hover:border-[#f04438] hover:text-[#f04438]'
                      }`}
                    >
                      <ArrowUp size={16} strokeWidth={3} />
                      <span className="text-[14px] font-black">{w.voteCount}</span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <h3 className="font-black text-[15px] text-[#151515] break-words flex-1">
                          {sort === 'top' && !search && kindFilter === 'all' && i < 3 && (
                            <span className="text-[#f04438] mr-1">#{i + 1}</span>
                          )}
                          {w.title}
                        </h3>
                        {w.status !== 'open' && (
                          <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${status.className}`}>
                            {w.status === 'available' && <CheckCircle2 size={11} />} {status.label}
                          </span>
                        )}
                      </div>
                      {w.details && <p className="text-[13px] text-[#666] mt-1 break-words line-clamp-3">{w.details}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#999]">
                        <span className="inline-flex items-center gap-1 font-bold text-[#777]">
                          <KindIcon size={12} /> {KINDS.find((k) => k.id === w.kind)?.label}
                        </span>
                        {w.category && <span>{w.category}</span>}
                        {w.region && <span>{w.region}</span>}
                        <span>{w.submitterName ? `by ${w.submitterName} · ` : ''}{timeAgo(w.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => shareWhatsApp(w)}
                          className="ml-auto font-bold text-[#f04438] hover:underline"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
