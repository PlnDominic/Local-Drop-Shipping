'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Package, TrendingUp, Wallet, X } from 'lucide-react';
import { useGlobalStore } from '../../store/globalStore';
import { useAuth } from '../../lib/auth/AuthProvider';
import {
  cancelPayout,
  getPayoutSettings,
  listMyPayouts,
  MOMO_NETWORKS,
  networkLabel,
  PAYOUT_STATUS_LABEL,
  PAYOUT_STATUS_STYLE,
  payoutFee,
  requestPayout,
  type MomoNetwork,
  type PayoutRequest,
  type PayoutSettings,
} from '../../lib/payouts';
import { useToast } from '../Toast';

const formatMoney = (amount: number) =>
  `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const labelClass = 'block text-[10px] text-[#777] font-bold mb-1 uppercase tracking-wider';
const inputClass = 'w-full h-10 rounded border border-gray-200 px-3 text-[12px] font-semibold focus:outline-none focus:border-[#f04438] bg-white';

/**
 * Balance, withdrawals to mobile money and transaction history. Shared by store owners
 * (commissions) and suppliers (payouts for shipped orders).
 */
export const WalletPanel: React.FC<{ intro: string }> = ({ intro }) => {
  const { currentUserId, wallets, transactions, hydrate } = useGlobalStore();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const uid = currentUserId || '';
  const wallet = wallets[uid] || { balance: 0, totalEarned: 0 };

  const [settings, setSettings] = useState<PayoutSettings | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [network, setNetwork] = useState<MomoNetwork>('MTN');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const [s, list] = await Promise.all([getPayoutSettings(), listMyPayouts(uid)]);
    setSettings(s);
    setPayouts(list);
    setLoaded(true);
  }, [uid]);

  useEffect(() => { void load(); }, [load]);

  // Fill in the details used last time (or the profile's) once, when they first arrive.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !loaded) return;
    const last = payouts.find((p) => p.network && p.account_number);
    if (last) {
      setNetwork(last.network as MomoNetwork);
      setAccountNumber(last.account_number ?? '');
      setAccountName(last.account_name);
    } else if (profile) {
      setAccountNumber(profile.phone || '');
      setAccountName(profile.fullName || '');
    } else {
      return;
    }
    prefilled.current = true;
  }, [loaded, payouts, profile]);

  const amt = parseFloat(amount);
  const fee = settings && amt > 0 ? payoutFee(amt, settings) : 0;
  const held = payouts.filter((p) => p.status === 'pending' || p.status === 'processing').reduce((n, p) => n + Number(p.amount), 0);
  const sent = payouts.filter((p) => p.status === 'paid').reduce((n, p) => n + Number(p.net_amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitted(false);
    if (!settings) return;
    if (isNaN(amt) || amt <= 0) return setError('Enter the amount you want to withdraw.');
    if (amt > wallet.balance) return setError('That is more than your available balance.');
    if (amt < settings.minAmount) return setError(`The minimum withdrawal is ${formatMoney(settings.minAmount)}.`);
    if (amt > settings.maxAmount) return setError(`The most you can withdraw at once is ${formatMoney(settings.maxAmount)}.`);

    setBusy('request');
    try {
      await requestPayout({ amount: amt, network, accountNumber, accountName });
      setSubmitted(true);
      setAmount('');
      showToast('Withdrawal requested', 'success');
      await Promise.all([load(), hydrate()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request the withdrawal.');
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (p: PayoutRequest) => {
    if (!window.confirm(`Cancel this withdrawal of ${formatMoney(Number(p.amount))}? The money goes back to your wallet.`)) return;
    setBusy(p.id);
    try {
      await cancelPayout(p.id);
      showToast('Withdrawal cancelled. The money is back in your wallet.', 'success');
      await Promise.all([load(), hydrate()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not cancel.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const unavailable = loaded && !settings;
  const disabled = !settings || settings.paused || busy === 'request';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* Withdraw */}
        <section className="bg-white rounded border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4">
            <h2 className="text-[15px] font-black text-[#151515]">Withdraw to mobile money</h2>
            <p className="text-[11px] text-[#888]">{intro}</p>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {unavailable && (
              <p className="rounded bg-gray-50 px-3 py-2.5 text-[11px] text-[#555] border border-gray-100">Withdrawals are being set up. Your balance is safe; please check back soon.</p>
            )}
            {settings?.paused && (
              <p className="rounded bg-yellow-50 px-3 py-2.5 text-[11px] text-yellow-800 border border-yellow-100">Withdrawals are paused for a short while. Your balance is safe; please try again later.</p>
            )}
            {error && (
              <div className="flex items-center gap-1.5 rounded bg-red-50 px-3 py-2.5 text-[11px] text-red-700 border border-red-100">
                <AlertCircle size={14} /> <span>{error}</span>
              </div>
            )}
            {submitted && (
              <div className="flex items-start gap-1.5 rounded bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800 border border-emerald-100">
                <CheckCircle2 size={14} className="mt-px flex-shrink-0" />
                <span>Request received. We check each withdrawal, then send it to your mobile money. You&apos;ll get an email when it&apos;s sent.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Network</label>
                <select value={network} onChange={(e) => setNetwork(e.target.value as MomoNetwork)} className={inputClass}>
                  {MOMO_NETWORKS.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Mobile money number</label>
                <input type="tel" required inputMode="tel" placeholder="024 123 4567" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Name on the account</label>
              <input type="text" required placeholder="As registered with your network" value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Amount (GHS)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-black text-[#777]">₵</span>
                <input
                  type="number"
                  min={settings?.minAmount ?? 1}
                  max={Math.max(0, Math.min(wallet.balance, settings?.maxAmount ?? wallet.balance))}
                  step="0.01"
                  required
                  placeholder="e.g. 200"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${inputClass} pl-7 font-black text-[#f04438]`}
                />
              </div>
              {settings && (
                <p className="mt-1.5 text-[11px] text-[#888]">
                  {amt > 0 && fee > 0 && <>Fee {formatMoney(fee)} · you receive <strong className="text-[#151515]">{formatMoney(Math.max(0, amt - fee))}</strong>. </>}
                  Minimum {formatMoney(settings.minAmount)}, up to {formatMoney(settings.maxAmount)} at once and {formatMoney(settings.dailyLimit)} a day
                  {settings.feeFlat > 0 || settings.feePercent > 0
                    ? ` · fee ${[settings.feeFlat > 0 ? formatMoney(settings.feeFlat) : '', settings.feePercent > 0 ? `${settings.feePercent}%` : ''].filter(Boolean).join(' + ')}`
                    : ' · no fee'}.
                </p>
              )}
            </div>

            <button type="submit" disabled={disabled} className="w-full h-11 rounded bg-[#151515] text-[12px] font-black text-white hover:bg-[#f04438] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
              <Wallet size={15} /> {busy === 'request' ? 'Requesting…' : 'Request withdrawal'}
            </button>
          </form>
        </section>

        {/* Withdrawals */}
        {payouts.length > 0 && (
          <section className="bg-white rounded border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="text-[15px] font-black text-[#151515]">Your withdrawals</h2>
            </div>
            <ul className="p-4 space-y-2">
              {payouts.map((p) => {
                const reason = p.status === 'failed' || p.status === 'rejected' ? p.admin_note || p.last_error : null;
                return (
                  <li key={p.id} className="rounded bg-[#f7f7f7] px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="block text-[12px] font-bold text-[#151515]">
                          {formatMoney(Number(p.net_amount))} to {p.network ? `${networkLabel(p.network)} ${p.account_number ?? ''}` : 'your account'}
                        </strong>
                        <span className="text-[10px] text-[#999]">{p.reference} · {when(p.created_at)}{Number(p.fee) > 0 ? ` · fee ${formatMoney(Number(p.fee))}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${PAYOUT_STATUS_STYLE[p.status]}`}>
                          {p.paid_manually ? 'Sent' : PAYOUT_STATUS_LABEL[p.status]}
                        </span>
                        {p.status === 'pending' && (
                          <button type="button" disabled={busy === p.id} onClick={() => handleCancel(p)} className="h-7 rounded border border-gray-200 bg-white px-2.5 text-[10px] font-black text-[#777] hover:border-red-300 hover:text-red-600 flex items-center gap-1 disabled:opacity-50">
                            <X size={11} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    {reason && <p className="mt-1.5 text-[11px] text-red-700">{reason}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* History */}
        <section className="bg-white rounded border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4">
            <h2 className="text-[15px] font-black text-[#151515]">Wallet history</h2>
          </div>
          <div className="p-4">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded p-12 text-center">
                <Package size={32} className="text-gray-300 mb-3" />
                <p className="text-[12px] text-[#777]">No transactions yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const negative = tx.amount < 0;
                  return (
                    <div key={tx.id} className="flex justify-between items-center gap-3 rounded bg-[#f7f7f7] px-4 py-3">
                      <div className="min-w-0">
                        <strong className="block text-[12px] font-bold text-[#151515] truncate">{tx.description}</strong>
                        <span className="text-[10px] text-[#999]">{tx.reference ? `${tx.reference} · ` : ''}{new Date(tx.createdAt).toLocaleString()}</span>
                      </div>
                      <strong className={`text-[13px] font-black whitespace-nowrap ${negative ? 'text-gray-500' : 'text-[#f04438]'}`}>
                        {negative ? '-' : '+'}{formatMoney(Math.abs(tx.amount))}
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Summary */}
      <div className="space-y-4">
        <div className="bg-[#151515] text-white rounded p-5 space-y-4">
          <div className="flex items-center gap-1.5 text-[#f04438]">
            <TrendingUp size={16} />
            <h3 className="text-[12px] font-black uppercase tracking-wider">Wallet</h3>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Available</p>
            <p className="text-2xl font-black">{formatMoney(wallet.balance)}</p>
          </div>
          <div className="space-y-2 border-t border-white/10 pt-3 text-[12px]">
            <div className="flex justify-between text-gray-400">
              <span>Waiting to be sent</span>
              <strong className="text-white">{formatMoney(held)}</strong>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Sent to you</span>
              <strong className="text-white">{formatMoney(sent)}</strong>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Total earned</span>
              <strong className="text-white">{formatMoney(wallet.totalEarned)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
