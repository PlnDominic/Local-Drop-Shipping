'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { useAuth } from '../../../../lib/auth/AuthProvider';
import { useToast } from '../../../../components/Toast';
import { DEFAULT_PREFS, loadPrefs, savePrefs, type NotificationPrefs } from '../../../../lib/notifications';

const inputClass = 'w-full h-11 rounded border border-gray-200 px-3 text-[13px] bg-white focus:outline-none focus:border-[#f04438]';

function Row({
  icon, title, hint, checked, onChange,
}: { icon: React.ReactNode; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded border border-gray-200 p-4 cursor-pointer hover:border-[#f04438]/50">
      <span className="mt-0.5 text-[#f04438]">{icon}</span>
      <span className="flex-1">
        <span className="block text-[13px] font-black text-[#151515]">{title}</span>
        <span className="block text-[12px] text-[#777] mt-0.5">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[#f04438]"
      />
    </label>
  );
}

export default function NotificationSettingsPage() {
  const { session, profile, loading } = useAuth();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    let live = true;
    loadPrefs(session.user.id)
      .then((p) => { if (live) setPrefs(p); })
      .catch(() => undefined)
      .finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [session]);

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" /></div>;
  }
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-[14px] text-[#555]">Sign in to manage your notifications.</p>
        <Link href="/login" className="mt-4 inline-block rounded bg-[#f04438] px-5 py-2.5 text-[12px] font-black text-white">Sign in</Link>
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await savePrefs(prefs);
      showToast('Notification settings saved.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your settings.');
    } finally {
      setSaving(false);
    }
  };

  const supplier = profile?.role === 'supplier';

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={20} className="text-[#f04438]" />
        <h1 className="text-[22px] font-black text-[#151515]">Notifications</h1>
      </div>
      <p className="text-[13px] text-[#777] mb-6">
        Choose how we reach you about {supplier ? 'new orders to fulfil, low stock, ' : 'new orders, '}shipping and delivery.
      </p>

      <form onSubmit={save} className="space-y-3">
        <Row icon={<Mail size={18} />} title="Email" hint={`Sent to ${session.user.email ?? 'your account email'}.`}
          checked={prefs.email} onChange={(v) => setPrefs({ ...prefs, email: v })} />
        <Row icon={<Smartphone size={18} />} title="SMS" hint="Short texts for new orders, shipping, delivery and cancellations."
          checked={prefs.sms} onChange={(v) => setPrefs({ ...prefs, sms: v })} />
        <Row icon={<MessageCircle size={18} />} title="WhatsApp" hint="Every alert, including low stock. Off unless you turn it on."
          checked={prefs.whatsapp} onChange={(v) => setPrefs({ ...prefs, whatsapp: v })} />

        <div>
          <label htmlFor="phone" className="block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider">Phone number for SMS and WhatsApp</label>
          <input
            id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="024 123 4567"
            value={prefs.phone} onChange={(e) => setPrefs({ ...prefs, phone: e.target.value })} className={inputClass}
          />
        </div>

        {error && <p role="alert" className="rounded bg-[#fff5f4] border border-[#f04438]/30 px-3 py-2 text-[12px] text-[#c0392b]">{error}</p>}

        <button
          type="submit" disabled={saving || !ready}
          className="h-11 w-full rounded bg-[#f04438] text-[12px] font-black text-white hover:bg-[#c0392b] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
