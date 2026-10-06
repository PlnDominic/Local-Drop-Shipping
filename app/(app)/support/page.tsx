'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LifeBuoy, MessageSquarePlus, Phone } from 'lucide-react';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useToast } from '../../../components/Toast';
import { StatusPill, TicketThread } from '../../../components/support/TicketThread';
import {
  createTicket,
  listAttachableOrders,
  listTickets,
  TICKET_CATEGORIES,
  type Ticket,
  type TicketCategory,
} from '../../../lib/supabase/support';
import { SITE } from '../../../lib/site';

const inputClass = 'w-full h-11 rounded border border-gray-200 px-3 text-[13px] bg-white focus:outline-none focus:border-[#f04438]';
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';

function SupportInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, profile, loading } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [orders, setOrders] = useState<{ id: string; orderNumber: string; createdAt: string }[]>([]);

  const [category, setCategory] = useState<TicketCategory>('order');
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setTickets(await listTickets());
      setListError('');
    } catch {
      setListError('Could not load your tickets. If this keeps happening, call us on ' + SITE.phones[0] + '.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    refresh();
    listAttachableOrders().then(setOrders).catch(() => setOrders([]));
  }, [session, refresh]);

  // /support?order=<id> (from My Orders) opens the form for that order.
  useEffect(() => {
    const pre = params.get('order');
    if (pre) {
      setCreating(true);
      setOrderId(pre);
      setCategory('order');
    }
  }, [params]);

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" /></div>;
  }

  if (!session || !profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <LifeBuoy size={40} className="mx-auto text-[#f04438]" />
        <h1 className="mt-4 text-2xl font-black text-[#151515]">Support</h1>
        <p className="mt-2 text-[13px] text-[#777]">Sign in to open a ticket and follow replies. You can also call us.</p>
        <Link href="/login" className="mt-5 inline-block h-11 rounded bg-[#151515] px-6 text-[13px] font-black leading-[44px] text-white hover:bg-[#f04438] transition-colors">Sign in</Link>
        <p className="mt-6 text-[12px] text-[#777] inline-flex items-center gap-1.5"><Phone size={13} /> {SITE.phones.join(' · ')}</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const t = await createTicket({ category, subject: subject.trim(), body: body.trim(), orderId: orderId || null });
      showToast(`Ticket ${t.ticketNumber} opened. We'll reply here.`, 'success');
      setCreating(false);
      setSubject('');
      setBody('');
      setOrderId('');
      router.replace('/support');
      await refresh();
      setSelected(t.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not open the ticket.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F9FAFB] min-h-[80vh]">
      <div className="max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest">Help</p>
            <h1 className="text-[26px] font-black text-[#151515]">Support &amp; disputes</h1>
            <p className="text-[12px] text-[#777]">Tell us what went wrong. Everyone on the order (you, the store, the supplier and our team) can see and reply.</p>
          </div>
          <button
            type="button"
            onClick={() => { setCreating(true); setSelected(null); }}
            className="h-11 rounded bg-[#f04438] px-5 text-[12px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center gap-1.5"
          >
            <MessageSquarePlus size={15} /> New ticket
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr] items-start">
          <aside className="rounded border border-gray-100 bg-white overflow-hidden">
            <p className="border-b border-gray-100 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#999]">Your tickets</p>
            {listLoading ? (
              <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />)}</div>
            ) : listError ? (
              <p className="p-4 text-[12px] text-red-700">{listError}</p>
            ) : tickets.length === 0 ? (
              <p className="p-6 text-center text-[12px] text-[#999]">No tickets yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => { setSelected(t.id); setCreating(false); }}
                      className={`w-full text-left px-4 py-3 transition-colors ${selected === t.id ? 'bg-[#f04438]/5' : 'hover:bg-[#fafafa]'}`}
                    >
                      <p className="text-[13px] font-bold text-[#151515] truncate">{t.subject}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[10px] text-[#999]">
                        <span>{t.ticketNumber}</span>
                        <StatusPill status={t.status} />
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section>
            {creating ? (
              <form onSubmit={submit} className="rounded border border-gray-100 bg-white p-5 space-y-4">
                <h2 className="text-[16px] font-black text-[#151515]">Open a new ticket</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="t-cat">What is it about?</label>
                    <select id="t-cat" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className={inputClass}>
                      {TICKET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="t-order">Related order (optional)</label>
                    <select id="t-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputClass}>
                      <option value="">Not about a specific order</option>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>{o.orderNumber} · {new Date(o.createdAt).toLocaleDateString('en-GB')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="t-sub">Subject</label>
                  <input id="t-sub" required minLength={3} maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Item arrived damaged" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="t-body">What happened?</label>
                  <textarea id="t-body" required maxLength={4000} rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us the details: what you expected, what happened, and anything we should know." className="w-full rounded border border-gray-200 px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#f04438] resize-none" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="h-11 rounded bg-[#f04438] px-6 text-[13px] font-black text-white hover:bg-[#c0392b] transition-colors disabled:opacity-60">
                    {submitting ? 'Opening…' : 'Open ticket'}
                  </button>
                  <button type="button" onClick={() => { setCreating(false); router.replace('/support'); }} className="h-11 rounded border border-gray-200 px-5 text-[13px] font-bold text-[#555] hover:border-[#151515] transition-colors">Cancel</button>
                </div>
              </form>
            ) : selected ? (
              <TicketThread ticketId={selected} viewerId={profile.id} onChanged={refresh} />
            ) : (
              <div className="rounded border border-dashed border-gray-200 bg-white p-12 text-center">
                <LifeBuoy size={34} className="mx-auto text-gray-300" />
                <p className="mt-3 font-black text-[#151515]">Pick a ticket or open a new one</p>
                <p className="mt-1 text-[12px] text-[#999]">Prefer to talk? Call {SITE.phones.join(' or ')}.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" /></div>}>
      <SupportInner />
    </Suspense>
  );
}
