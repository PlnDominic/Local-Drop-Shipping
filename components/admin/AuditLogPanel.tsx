'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

interface Entry {
  id: number;
  actor_id: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

const PAGE = 100;

const AREAS: { id: string; label: string; types: string[] }[] = [
  { id: 'all', label: 'Everything', types: [] },
  { id: 'money', label: 'Withdrawals', types: ['payout'] },
  { id: 'orders', label: 'Orders & earnings', types: ['order', 'refund'] },
  { id: 'suppliers', label: 'Suppliers', types: ['supplier', 'supplier_verification'] },
  { id: 'users', label: 'Users', types: ['user'] },
  { id: 'settings', label: 'Settings & delivery', types: ['setting', 'delivery_zone'] },
  { id: 'reviews', label: 'Reviews', types: ['review'] },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Admin: read-only history of admin and money-related actions. */
export const AuditLogPanel: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [area, setArea] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    const types = AREAS.find((a) => a.id === area)?.types ?? [];
    let q = supabase.from('audit_log').select('*').order('id', { ascending: false }).range(offset, offset + PAGE - 1);
    if (types.length) q = q.in('entity_type', types);
    const term = query.trim().replace(/[%_,()"\\]/g, ' ').trim();
    if (term) q = q.or(`summary.ilike.%${term}%,action.ilike.%${term}%,entity_id.ilike.%${term}%`);

    const { data, error: err } = await q;
    setLoading(false);
    if (err) {
      setError('Could not load the audit log. Apply supabase/audit-log.sql first.');
      return;
    }
    setError('');
    const rows = data as Entry[];
    setHasMore(rows.length === PAGE);
    setEntries((prev) => (offset === 0 ? rows : [...prev, ...rows]));

    const ids = [...new Set(rows.map((r) => r.actor_id).filter((v): v is string => Boolean(v)))];
    if (ids.length) {
      const { data: people } = await supabase.from('users').select('id, full_name, email').in('id', ids);
      setNames((prev) => {
        const next = { ...prev };
        for (const p of (people ?? []) as { id: string; full_name: string; email: string }[]) next[p.id] = p.full_name || p.email;
        return next;
      });
    }
  }, [area, query]);

  useEffect(() => {
    const t = setTimeout(() => { void load(0); }, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <section className="bg-white rounded border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <ScrollText size={16} className="text-[#f04438]" />
          <h2 className="text-[15px] font-black text-[#151515]">Audit log</h2>
        </div>
        <p className="text-[12px] text-[#777]">Every admin decision and money movement, with who did it. Entries cannot be edited or deleted.</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {AREAS.map((a) => (
            <button key={a.id} type="button" onClick={() => setArea(a.id)}
              className={`h-8 rounded px-3 text-[11px] font-black transition-colors ${area === a.id ? 'bg-[#151515] text-white' : 'bg-gray-100 text-[#555] hover:bg-gray-200'}`}>
              {a.label}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search (order number, reference…)"
              className="h-8 w-full rounded border border-gray-200 pl-8 pr-3 text-[12px] outline-none focus:border-[#f04438]" />
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-5"><div className="rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">{error}</div></div>
      ) : entries.length === 0 && !loading ? (
        <div className="p-10 text-center text-[13px] text-[#999]">Nothing recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-[#f5f5f5] text-left text-[10px] uppercase tracking-wider text-[#777]">
              <tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">What happened</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 align-top">
                  <td className="p-3 whitespace-nowrap text-[#777]">{when(e.created_at)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-bold text-[#151515]">{e.actor_id ? names[e.actor_id] ?? 'Deleted user' : 'System'}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#999]">{e.actor_role}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap font-mono text-[11px] text-[#555]">{e.action}</td>
                  <td className="p-3 text-[#333] break-words min-w-[240px]">{e.summary || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(loading || hasMore) && !error && (
        <div className="p-4 text-center">
          <button type="button" disabled={loading} onClick={() => load(entries.length)} className="h-9 rounded border border-gray-200 px-4 text-[12px] font-black text-[#555] hover:border-[#f04438] disabled:opacity-50">
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
};
