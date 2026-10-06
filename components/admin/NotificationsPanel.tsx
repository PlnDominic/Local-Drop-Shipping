'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../Toast';

interface Row {
  id: string;
  event: string;
  channel: 'email' | 'sms' | 'whatsapp';
  to_address: string;
  subject: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  last_error: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<Row['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-[#f04438]/10 text-[#c0392b]',
  skipped: 'bg-gray-100 text-gray-600',
};

/** Admin view of the notification outbox, with a button to send anything waiting. */
export const NotificationsPanel: React.FC = () => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [list, summary] = await Promise.all([
      supabase.from('notification_outbox')
        .select('id, event, channel, to_address, subject, status, attempts, last_error, created_at')
        .order('created_at', { ascending: false }).limit(100),
      supabase.rpc('notification_summary'),
    ]);
    if (list.error) setError('Could not load notifications. Apply supabase/engagement-features.sql first.');
    else { setError(''); setRows(list.data as Row[]); }
    setCounts((summary.data as Record<string, number> | null) ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sendNow = async () => {
    setSending(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      });
      const body = (await res.json().catch(() => ({}))) as { dispatched?: boolean; reason?: string; sent?: number; skipped?: number; failed?: number };
      if (body.dispatched) showToast(`Sent ${body.sent}, skipped ${body.skipped}, failed ${body.failed}.`, 'success');
      else showToast(body.reason || 'Could not send notifications.', 'error');
    } catch {
      showToast('Could not reach the server.', 'error');
    } finally {
      setSending(false);
      void load();
    }
  };

  const total = (status: string) =>
    Object.entries(counts).filter(([k]) => k.endsWith(`:${status}`)).reduce((n, [, c]) => n + Number(c), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {(['pending', 'sent', 'skipped', 'failed'] as const).map((s) => (
          <div key={s} className="rounded border border-gray-200 bg-white px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#777]">{s}</div>
            <div className="text-[20px] font-black text-[#151515]">{total(s)}</div>
          </div>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => void load()} className="h-10 px-3 rounded border border-gray-200 text-[11px] font-black flex items-center gap-1.5 hover:border-[#f04438]">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={sendNow} disabled={sending} className="h-10 px-4 rounded bg-[#f04438] text-white text-[11px] font-black flex items-center gap-1.5 disabled:opacity-60">
            <Send size={13} /> {sending ? 'Sending…' : 'Send now'}
          </button>
        </div>
      </div>

      <p className="text-[12px] text-[#777]">
        &ldquo;Skipped&rdquo; means that channel is not set up on the server yet (see the SMS, WhatsApp and email settings in the deployment guide).
      </p>

      {error && <p className="rounded bg-[#fff5f4] border border-[#f04438]/30 px-3 py-2 text-[12px] text-[#c0392b]">{error}</p>}

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-[12px]">
          <thead className="bg-[#f5f5f5] text-left text-[10px] uppercase tracking-wider text-[#777]">
            <tr><th className="p-3">When</th><th className="p-3">Event</th><th className="p-3">Channel</th><th className="p-3">To</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-6 text-center text-[#777]">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-[#777]">No notifications yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-3">{r.event.replace(/_/g, ' ')}</td>
                <td className="p-3 uppercase">{r.channel}</td>
                <td className="p-3">{r.to_address}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  {r.last_error && <span className="block text-[10px] text-[#999] mt-1 max-w-[260px] truncate" title={r.last_error}>{r.last_error}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
