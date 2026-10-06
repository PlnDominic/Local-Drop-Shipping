'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Heart, MailCheck, MailX, RefreshCw, Search, Send, Trash2 } from 'lucide-react';
import { useToast } from '../Toast';
import {
  deleteWishlistSignups,
  getWishlistSignups,
  sendWishlistInvites,
  setWishlistInvited,
  type WishlistRole,
  type WishlistSignup,
} from '../../lib/supabase/wishlist';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

type InviteFilter = 'all' | 'pending' | 'invited';

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** Admin view of the pre-launch wishlist: filter, export, and track invites. */
export const WishlistSignupsPanel: React.FC<{ onCountsChange?: (pendingInvites: number) => void }> = ({
  onCountsChange,
}) => {
  const { showToast } = useToast();

  const [signups, setSignups] = useState<WishlistSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const [roleFilter, setRoleFilter] = useState<WishlistRole | 'all'>('all');
  const [inviteFilter, setInviteFilter] = useState<InviteFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setSignups(await getWishlistSignups());
      setSelected(new Set());
    } catch {
      setLoadError('Could not load the wishlist. Make sure the latest supabase/schema.sql has been applied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const pending = signups.filter((s) => !s.invitedAt).length;
    return {
      total: signups.length,
      dropshipper: signups.filter((s) => s.role === 'dropshipper').length,
      supplier: signups.filter((s) => s.role === 'supplier').length,
      pending,
      joined: signups.filter((s) => s.joinedAt).length,
    };
  }, [signups]);

  useEffect(() => {
    onCountsChange?.(stats.pending);
  }, [stats.pending, onCountsChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return signups
      .filter((s) => roleFilter === 'all' || s.role === roleFilter)
      .filter((s) => inviteFilter === 'all' || (inviteFilter === 'invited' ? !!s.invitedAt : !s.invitedAt))
      .filter((s) => !q || `${s.email} ${s.fullName}`.toLowerCase().includes(q));
  }, [signups, roleFilter, inviteFilter, query]);

  // Actions apply to the selected rows, or to everything currently filtered if nothing is selected.
  const selectedInView = filtered.filter((s) => selected.has(s.id));
  const targets = selectedInView.length ? selectedInView : filtered;
  const targetLabel = selectedInView.length ? `${selectedInView.length} selected` : `all ${filtered.length} shown`;

  const allChecked = filtered.length > 0 && selectedInView.length === filtered.length;
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(filtered.map((s) => s.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copyEmails = async () => {
    const emails = [...new Set(targets.map((s) => s.email))].join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      showToast(`Copied ${targets.length} email${targets.length === 1 ? '' : 's'} — paste into BCC.`, 'success');
    } catch {
      showToast('Could not copy to clipboard.', 'error');
    }
  };

  const exportCsv = () => {
    const header = 'email,role,name,signed_up,invited_at,joined_at';
    const lines = targets.map((s) =>
      [s.email, s.role, s.fullName, s.createdAt, s.invitedAt ?? '', s.joinedAt ?? ''].map(csvCell).join(','),
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wishlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markInvited = async (invited: boolean) => {
    const ids = targets.map((s) => s.id);
    if (!ids.length) return;
    setBusy(true);
    try {
      const invitedAt = await setWishlistInvited(ids, invited);
      const idSet = new Set(ids);
      setSignups((prev) => prev.map((s) => (idSet.has(s.id) ? { ...s, invitedAt } : s)));
      setSelected(new Set());
      showToast(`Marked ${ids.length} as ${invited ? 'invited' : 'not invited'}.`, 'success');
    } catch {
      showToast('Could not update. Are you signed in as an admin?', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Emails a sign-up link to everyone targeted who has not already joined.
  const sendInvites = async () => {
    const list = targets.filter((s) => !s.joinedAt);
    if (!list.length) { showToast('Everyone shown has already joined.', 'error'); return; }
    if (!window.confirm(`Email a sign-up invite to ${list.length} ${list.length === 1 ? 'person' : 'people'}?`)) return;
    setBusy(true);
    setProgress(`0/${list.length}`);
    try {
      const result = await sendWishlistInvites(list.map((s) => s.id), (d, t) => setProgress(`${d}/${t}`));
      const sentSet = new Set(result.sentIds);
      const now = new Date().toISOString();
      setSignups((prev) => prev.map((s) => (sentSet.has(s.id) ? { ...s, invitedAt: now, inviteCount: s.inviteCount + 1 } : s)));
      setSelected(new Set());
      showToast(
        `Sent ${result.sent} invite${result.sent === 1 ? '' : 's'}${result.failed.length ? `, ${result.failed.length} failed` : ''}.`,
        result.failed.length ? 'error' : 'success',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send invites.', 'error');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const removeSelected = async () => {
    const ids = selectedInView.map((s) => s.id);
    if (!ids.length) return;
    if (!window.confirm(`Permanently delete ${ids.length} signup${ids.length === 1 ? '' : 's'}?`)) return;
    setBusy(true);
    try {
      await deleteWishlistSignups(ids);
      const idSet = new Set(ids);
      setSignups((prev) => prev.filter((s) => !idSet.has(s.id)));
      setSelected(new Set());
      showToast(`Deleted ${ids.length}.`, 'success');
    } catch {
      showToast('Could not delete. Are you signed in as an admin?', 'error');
    } finally {
      setBusy(false);
    }
  };

  const actionBtn =
    'h-9 rounded border border-gray-200 px-3 text-[11px] font-black text-[#555] hover:border-[#151515] hover:text-[#151515] transition-colors flex items-center gap-1.5 disabled:opacity-50';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total signups', value: stats.total },
          { label: 'Dropshippers', value: stats.dropshipper },
          { label: 'Suppliers', value: stats.supplier },
          { label: 'Not yet invited', value: stats.pending, accent: true },
          { label: 'Joined (made an account)', value: stats.joined },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded border border-gray-100 p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#999] font-bold">{card.label}</p>
            <p className={`text-2xl font-black mt-1 ${card.accent ? 'text-[#f04438]' : 'text-[#151515]'}`}>
              {loading ? '–' : card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="bg-white rounded border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-black text-[#151515]">Wishlist Signups</h2>
            <p className="text-[11px] text-[#888]">
              Pre-launch emails from the homepage. Actions apply to {targetLabel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              aria-label="Filter by role"
              className="h-9 rounded border border-gray-200 px-3 text-[11px] font-semibold bg-white"
            >
              <option value="all">All roles</option>
              <option value="dropshipper">Dropshippers</option>
              <option value="supplier">Suppliers</option>
            </select>
            <select
              value={inviteFilter}
              onChange={(e) => setInviteFilter(e.target.value as InviteFilter)}
              aria-label="Filter by invite status"
              className="h-9 rounded border border-gray-200 px-3 text-[11px] font-semibold bg-white"
            >
              <option value="all">Any status</option>
              <option value="pending">Not invited</option>
              <option value="invited">Invited</option>
            </select>
            <div className="flex h-9 items-center border border-gray-200 rounded overflow-hidden max-w-[220px]">
              <Search size={13} className="ml-3 text-gray-400 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search email or name..."
                className="flex-1 min-w-0 px-2 text-[11px] outline-none"
              />
            </div>
            <button type="button" onClick={load} disabled={loading} aria-label="Refresh" className={actionBtn}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-3 flex flex-wrap items-center gap-2 bg-[#fafafa]">
          <button
            type="button"
            onClick={sendInvites}
            disabled={busy || !targets.length}
            className="h-9 rounded bg-[#f04438] px-3 text-[11px] font-black text-white hover:bg-[#c0392b] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send size={13} /> {busy && progress ? `Sending ${progress}…` : 'Send invites'}
          </button>
          <button type="button" onClick={copyEmails} disabled={!targets.length} className={actionBtn}>
            <Copy size={13} /> Copy emails
          </button>
          <button type="button" onClick={exportCsv} disabled={!targets.length} className={actionBtn}>
            <Download size={13} /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => markInvited(true)}
            disabled={busy || !targets.length}
            className="h-9 rounded bg-[#151515] px-3 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <MailCheck size={13} /> Mark invited
          </button>
          <button type="button" onClick={() => markInvited(false)} disabled={busy || !targets.length} className={actionBtn}>
            <MailX size={13} /> Mark not invited
          </button>
          {selectedInView.length > 0 && (
            <button
              type="button"
              onClick={removeSelected}
              disabled={busy}
              className="ml-auto h-9 rounded border border-red-200 px-3 text-[11px] font-black text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={13} /> Delete selected
            </button>
          )}
        </div>

        {loadError ? (
          <div className="p-5">
            <div className="rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">{loadError}</div>
          </div>
        ) : !loading && filtered.length === 0 ? (
          <div className="p-5">
            <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-16 text-center">
              <Heart size={40} className="text-gray-300 mb-4" />
              <p className="font-black text-[#151515] text-lg">
                {signups.length === 0 ? 'No signups yet' : 'No signups match'}
              </p>
              <p className="mt-2 text-sm text-[#777]">
                {signups.length === 0
                  ? 'Share the homepage to start collecting dropshipper and supplier emails.'
                  : 'Try a different search or filter.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f7f7f7] border-b border-gray-100 text-[10px] text-[#999] font-black uppercase tracking-wider">
                  <th className="p-4 w-10">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" className="accent-[#f04438]" />
                  </th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Signed up</th>
                  <th className="p-4">Invite</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[12px] text-[#151515]">
                {loading
                  ? [0, 1, 2].map((i) => (
                      <tr key={i}>
                        <td colSpan={7} className="p-4">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : filtered.map((s) => (
                      <tr key={s.id} className={selected.has(s.id) ? 'bg-[#f04438]/5' : 'hover:bg-[#fafafa]'}>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggleOne(s.id)}
                            aria-label={`Select ${s.email}`}
                            className="accent-[#f04438]"
                          />
                        </td>
                        <td className="p-4 font-bold">
                          <a href={`mailto:${s.email}`} className="hover:text-[#f04438]">{s.email}</a>
                        </td>
                        <td className="p-4 text-[#777]">{s.fullName || '—'}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded ${
                              s.role === 'supplier' ? 'bg-blue-50 text-blue-700' : 'bg-[#f04438]/10 text-[#c0392b]'
                            }`}
                          >
                            {s.role}
                          </span>
                        </td>
                        <td className="p-4 text-[#999] text-[11px]">{formatDate(s.createdAt)}</td>
                        <td className="p-4 text-[11px]">
                          {s.invitedAt ? (
                            <span className="text-emerald-600 font-black">Invited {formatDate(s.invitedAt)}</span>
                          ) : (
                            <span className="text-[#999] font-semibold">Not yet</span>
                          )}
                          {s.inviteCount > 1 && <span className="ml-1 text-[#999]">(×{s.inviteCount})</span>}
                        </td>
                        <td className="p-4 text-[11px]">
                          {s.joinedAt ? (
                            <span className="text-emerald-600 font-black">Joined {formatDate(s.joinedAt)}</span>
                          ) : (
                            <span className="text-[#999]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
