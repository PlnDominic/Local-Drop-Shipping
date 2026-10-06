'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { StatusPill, TicketThread } from '../support/TicketThread';
import { listTickets, TICKET_STATUS_LABEL, type Ticket, type TicketStatus } from '../../lib/supabase/support';

/** Admin inbox for every support and dispute ticket. */
export const SupportPanel: React.FC<{ adminId: string; onChanged?: () => void }> = ({ adminId, onChanged }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TicketStatus | 'active' | 'all'>('active');
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTickets(await listTickets(filter === 'all' ? undefined : filter));
      setError('');
    } catch {
      setError('Could not load tickets. Apply supabase/launch-features.sql first.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  return (
    <section className="grid gap-4 lg:grid-cols-[340px_1fr] items-start">
      <div className="bg-white rounded border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2"><LifeBuoy size={16} className="text-[#f04438]" /><h2 className="text-[15px] font-black text-[#151515]">Support tickets</h2></div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter tickets" className="h-9 w-full rounded border border-gray-200 px-2 text-[12px] font-semibold bg-white">
            <option value="active">Needs attention (open, in progress, waiting)</option>
            {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map((s) => <option key={s} value={s}>{TICKET_STATUS_LABEL[s]}</option>)}
            <option value="all">All tickets</option>
          </select>
        </div>
        {error ? (
          <p className="p-4 text-[12px] text-red-700">{error}</p>
        ) : loading ? (
          <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />)}</div>
        ) : tickets.length === 0 ? (
          <p className="p-8 text-center text-[12px] text-[#999]">No tickets here.</p>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[65vh] overflow-y-auto">
            {tickets.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setSelected(t.id)} className={`w-full text-left px-4 py-3 transition-colors ${selected === t.id ? 'bg-[#f04438]/5' : 'hover:bg-[#fafafa]'}`}>
                  <p className="text-[13px] font-bold text-[#151515] truncate">{t.subject}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-[#999]">
                    <span>{t.ticketNumber}</span>{t.orderNumber && <span>· {t.orderNumber}</span>}<StatusPill status={t.status} viewerIsAdmin />
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {selected ? (
          <TicketThread ticketId={selected} viewerId={adminId} isAdmin onChanged={() => { load(); onChanged?.(); }} />
        ) : (
          <div className="rounded border border-dashed border-gray-200 bg-white p-12 text-center text-[13px] text-[#999]">Select a ticket to read and reply.</div>
        )}
      </div>
    </section>
  );
};
