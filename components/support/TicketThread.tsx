'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Send } from 'lucide-react';
import { useToast } from '../Toast';
import {
  getTicket,
  listMessages,
  postMessage,
  setTicketStatus,
  TICKET_STATUS_LABEL,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
} from '../../lib/supabase/support';

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-purple-50 text-purple-700',
  waiting: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-gray-100 text-gray-500',
};

export const StatusPill: React.FC<{ status: TicketStatus; viewerIsAdmin?: boolean }> = ({ status, viewerIsAdmin }) => (
  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${STATUS_STYLE[status]}`}>
    {status === 'waiting' && viewerIsAdmin ? 'Waiting for customer' : TICKET_STATUS_LABEL[status]}
  </span>
);

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * One ticket's conversation: messages, reply box, and status controls.
 * `viewerId` marks the viewer's own messages; admins can also add internal notes.
 */
export const TicketThread: React.FC<{
  ticketId: string;
  viewerId: string;
  isAdmin?: boolean;
  onChanged?: () => void;
}> = ({ ticketId, viewerId, isAdmin = false, onChanged }) => {
  const { showToast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([getTicket(ticketId), listMessages(ticketId)]);
      setTicket(t);
      setMessages(m);
      setError('');
    } catch {
      setError('Could not load this ticket.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    setBody('');
    setInternal(false);
    load();
    const id = setInterval(load, 20000); // pick up replies without a manual refresh
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await postMessage(ticketId, body.trim(), internal);
      setBody('');
      setInternal(false);
      await load();
      onChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send your message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: TicketStatus) => {
    try {
      await setTicketStatus(ticketId, status);
      await load();
      onChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not change the status.', 'error');
    }
  };

  if (loading) return <div className="h-40 rounded bg-gray-100 animate-pulse" />;
  if (error || !ticket) return <div className="rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">{error || 'Ticket not found.'}</div>;

  const isOwner = ticket.createdBy === viewerId;
  const closed = ticket.status === 'closed';

  return (
    <div className="flex flex-col rounded border border-gray-100 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#999]">
            {ticket.ticketNumber}{ticket.orderNumber ? ` · Order ${ticket.orderNumber}` : ''}
          </p>
          <h2 className="mt-0.5 text-[16px] font-black text-[#151515] break-words">{ticket.subject}</h2>
          <div className="mt-1.5"><StatusPill status={ticket.status} viewerIsAdmin={isAdmin} /></div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <select
              value={ticket.status}
              onChange={(e) => changeStatus(e.target.value as TicketStatus)}
              aria-label="Ticket status"
              className="h-9 rounded border border-gray-200 px-2 text-[11px] font-semibold bg-white"
            >
              {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>{TICKET_STATUS_LABEL[s]}</option>
              ))}
            </select>
          ) : (
            isOwner && (
              <button
                type="button"
                onClick={() => changeStatus(closed ? 'open' : 'closed')}
                className="h-9 rounded border border-gray-200 px-3 text-[11px] font-black text-[#555] hover:border-[#151515] transition-colors"
              >
                {closed ? 'Reopen ticket' : 'Mark as solved & close'}
              </button>
            )
          )}
        </div>
      </div>

      <div className="max-h-[48vh] min-h-[160px] space-y-3 overflow-y-auto p-4 bg-[#fafafa]">
        {messages.map((m) => {
          const mine = m.authorId === viewerId;
          const staff = m.authorRole === 'admin';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.isInternal
                    ? 'bg-yellow-50 border border-yellow-200 text-[#5c4a00]'
                    : mine
                      ? 'bg-[#151515] text-white'
                      : staff
                        ? 'bg-[#f04438]/10 border border-[#f04438]/20 text-[#151515]'
                        : 'bg-white border border-gray-200 text-[#151515]'
                }`}
              >
                <p className={`mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${mine && !m.isInternal ? 'text-gray-400' : 'text-[#999]'}`}>
                  {m.isInternal && <Lock size={10} />}
                  {m.isInternal ? 'Internal note' : m.authorName || 'User'}
                  {!m.isInternal && !staff && !mine && m.authorRole ? ` · ${m.authorRole}` : ''}
                  <span className="font-semibold normal-case tracking-normal">· {when(m.createdAt)}</span>
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {closed && !isAdmin ? (
        <p className="border-t border-gray-100 p-4 text-[12px] text-[#777]">
          This ticket is closed. {isOwner ? 'Reopen it above if you still need help.' : ''}
        </p>
      ) : (
        <form onSubmit={send} className="border-t border-gray-100 p-4 space-y-2.5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder={internal ? 'Internal note (only the support team can see this)…' : 'Write a reply…'}
            className={`w-full rounded border px-3 py-2.5 text-[13px] outline-none focus:border-[#f04438] resize-none ${internal ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isAdmin ? (
              <label className="flex items-center gap-1.5 text-[12px] font-semibold text-[#555]">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-[#f04438]" />
                Internal note (hidden from customer)
              </label>
            ) : <span />}
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="h-10 rounded bg-[#f04438] px-5 text-[12px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {sending ? 'Sending…' : internal ? 'Add note' : 'Send reply'} <Send size={13} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
