'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { paymentsRequired, startPayment, verifyPayment } from '../../../lib/payments';
import { CheckCircle2, Download, LifeBuoy, PackageOpen, Truck, XCircle } from 'lucide-react';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useToast } from '../../../components/Toast';
import { downloadReceipt } from '../../../lib/receipts';
import { formatDeliveryEta } from '../../../lib/checkout';
import { POLICY } from '../../../lib/site';
import {
  cancelMyOrder,
  getMyOrders,
  requestOrderRefund,
  returnDaysLeft,
  type MyOrder,
  type OrderStatus,
  type RefundRequest,
} from '../../../lib/supabase/myOrders';

const money = (n: number) => `GHS ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-purple-50 text-purple-700',
  shipped: 'bg-blue-50 text-blue-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-red-50 text-red-700',
};

const STEPS: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const Progress: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const idx = STEPS.indexOf(status);
  if (idx < 0) return null;
  return (
    <ol className="mt-3 flex items-center gap-1" aria-label="Order progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1">
          <span className={`h-1.5 rounded-full ${i <= idx ? 'bg-[#f04438]' : 'bg-gray-200'}`} />
          <span className={`text-[9px] font-black uppercase tracking-wider ${i <= idx ? 'text-[#151515]' : 'text-[#bbb]'}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
};

const RefundNote: React.FC<{ r: RefundRequest }> = ({ r }) => {
  const label = r.kind === 'not_received' ? 'Not received' : 'Return';
  if (r.status === 'requested')
    return <p className="rounded bg-yellow-50 border border-yellow-200 px-3 py-2 text-[12px] text-[#5c4a00]"><strong>{label} requested.</strong> Our team is reviewing it and will update this page, usually within 3 business days.</p>;
  if (r.status === 'approved')
    return <p className="rounded bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800"><strong>Refund approved{r.refundAmount != null ? ` (${money(r.refundAmount)})` : ''}.</strong> We&apos;ll send it to your mobile money number and mark it paid here.{r.adminNote ? ` Note from us: ${r.adminNote}` : ''}</p>;
  if (r.status === 'completed')
    return <p className="rounded bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800"><strong>Refund sent{r.refundAmount != null ? ` (${money(r.refundAmount)})` : ''}{r.customerRefundedAt ? ` on ${date(r.customerRefundedAt)}` : ''}.</strong>{r.adminNote ? ` ${r.adminNote}` : ''}</p>;
  return <p className="rounded bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-800"><strong>Request declined.</strong> {r.adminNote || ''} You can reply to us in a <Link href={`/support?order=${r.orderId}`} className="font-bold underline">support ticket</Link>.</p>;
};

export default function MyOrdersPage() {
  const { session, profile, loading } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [payOn, setPayOn] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    try {
      setOrders(await getMyOrders(profile.id));
      setError('');
    } catch {
      setError('We could not load your orders. Please refresh, or call us if this keeps happening.');
    } finally {
      setFetching(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) refresh();
    else if (!loading) setFetching(false);
  }, [profile, loading, refresh]);

  // Whether unpaid orders need a Pay now button.
  useEffect(() => { void paymentsRequired().then(setPayOn); }, []);

  // Back from Paystack: confirm the payment, then show the result.
  useEffect(() => {
    if (!profile) return;
    const q = new URLSearchParams(window.location.search);
    const ref = q.get('reference') || q.get('trxref');
    if (q.get('payment') === 'retry') showToast('Your order is saved. Tap Pay now to finish paying.', 'error');
    if (!ref) return;
    window.history.replaceState(null, '', '/orders');
    void (async () => {
      const result = await verifyPayment(ref);
      if (result === 'paid' || result === 'already_paid') showToast('Payment received. Thank you!', 'success');
      else if (result === 'pending') showToast('Your payment is still processing. This page will update shortly.', 'error');
      else showToast('The payment did not go through. You can try again with Pay now.', 'error');
      await refresh();
    })();
  }, [profile, refresh, showToast]);

  const payNow = async (o: MyOrder) => {
    setBusy(`p-${o.id}`);
    try {
      window.location.assign(await startPayment([o.id]));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not start the payment.', 'error');
      setBusy(null);
    }
  };

  const run = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id);
    try {
      await fn();
      showToast(ok, 'success');
      setRefundFor(null);
      setReason('');
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const cancel = (o: MyOrder) => {
    if (!window.confirm(`Cancel order ${o.orderNumber}? This can't be undone.`)) return;
    run(o.id, () => cancelMyOrder(o.id, 'Cancelled by customer'), 'Order cancelled.');
  };

  const receipt = async (o: MyOrder) => {
    setBusy(`r-${o.id}`);
    try {
      await downloadReceipt(o.id, o.orderNumber);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not download the receipt.', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading || fetching) {
    return <div className="min-h-[60vh] grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-[#f04438] border-t-transparent animate-spin" /></div>;
  }

  if (!session || !profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <PackageOpen size={40} className="mx-auto text-[#f04438]" />
        <h1 className="mt-4 text-2xl font-black text-[#151515]">My orders</h1>
        <p className="mt-2 text-[13px] text-[#777]">Sign in to see your orders, track deliveries and download receipts.</p>
        <Link href="/login" className="mt-5 inline-block h-11 rounded bg-[#151515] px-6 text-[13px] font-black leading-[44px] text-white hover:bg-[#f04438] transition-colors">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="bg-[#F9FAFB] min-h-[80vh]">
      <div className="max-w-[860px] mx-auto px-4 py-8">
        <p className="text-[#f04438] text-[11px] font-black uppercase tracking-widest">Account</p>
        <h1 className="text-[26px] font-black text-[#151515]">My orders</h1>
        <p className="text-[12px] text-[#777]">
          Track an order, cancel it before it ships, or ask for a return within {POLICY.returnWindowDays} days of delivery.
          See our <Link href="/returns" className="font-bold text-[#f04438] hover:underline">returns policy</Link>.
        </p>

        {error && <div className="mt-5 rounded bg-red-50 px-4 py-3 text-[12px] text-red-700 border border-red-100">{error}</div>}

        {!error && orders.length === 0 && (
          <div className="mt-6 rounded border border-dashed border-gray-200 bg-white p-12 text-center">
            <PackageOpen size={36} className="mx-auto text-gray-300" />
            <p className="mt-3 font-black text-[#151515]">No orders yet</p>
            <Link href="/marketplace" className="mt-3 inline-block text-[13px] font-bold text-[#f04438] hover:underline">Start shopping</Link>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {orders.map((o) => {
            const canCancel = (POLICY.cancellableStatuses as readonly string[]).includes(o.status);
            const daysLeft = returnDaysLeft(o);
            const openRefund = o.refund && (o.refund.status === 'requested' || o.refund.status === 'approved');
            const canRefund =
              !o.refund?.status || o.refund.status === 'rejected'
                ? (o.status === 'shipped' || (o.status === 'delivered' && (daysLeft ?? 0) > 0))
                : false;
            const kind = o.status === 'shipped' ? 'not_received' : 'return';
            return (
              <article key={o.id} className="rounded border border-gray-100 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-black text-[#151515]">{o.orderNumber}</p>
                    <p className="text-[11px] text-[#999]">{date(o.createdAt)}{o.storeName ? ` · ${o.storeName}` : ''}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider ${STATUS_STYLE[o.status]}`}>
                    {payOn && o.paymentStatus === 'unpaid' && o.status === 'pending' ? 'awaiting payment' : o.status}
                  </span>
                </div>

                {payOn && o.paymentStatus === 'unpaid' && o.status === 'pending' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-3 text-[12px] text-[#5c4a00]">
                    <span>Pay within 2 hours or this order is cancelled automatically.</span>
                    <button
                      type="button"
                      onClick={() => payNow(o)}
                      disabled={busy === `p-${o.id}`}
                      className="h-9 rounded bg-[#f04438] px-4 text-[12px] font-black text-white hover:bg-[#c0392b] disabled:opacity-60"
                    >
                      {busy === `p-${o.id}` ? 'Opening…' : `Pay ${money(o.total)}`}
                    </button>
                  </div>
                )}

                <div className="px-4 py-3">
                  <Progress status={o.status} />
                  {(o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing' || o.status === 'shipped') && o.deliveryMinDays != null && o.deliveryMaxDays != null && (
                    <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#555]">
                      <Truck size={13} className="text-[#f04438]" />
                      Estimated delivery: about {formatDeliveryEta({ minDays: o.deliveryMinDays, maxDays: o.deliveryMaxDays })} after it ships
                    </p>
                  )}

                  <ul className="mt-3 divide-y divide-gray-100">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex items-center gap-3 py-2">
                        {it.image ? (
                          <img src={it.image} alt="" className="h-10 w-10 rounded object-cover bg-gray-100" />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded bg-gray-100 text-gray-300"><PackageOpen size={16} /></span>
                        )}
                        <span className="min-w-0 flex-1 text-[13px] text-[#151515] truncate">{it.name} <span className="text-[#999]">× {it.quantity}</span></span>
                        {o.status === 'delivered' && it.reviewHref && (
                          <Link href={it.reviewHref} className="text-[11px] font-black text-[#f04438] hover:underline">Rate</Link>
                        )}
                        <span className="text-[13px] font-semibold">{money(it.unitPrice * it.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-2 space-y-1 text-[12px] text-[#777]">
                    <div className="flex justify-between"><dt>Items</dt><dd>{money(o.subtotal)}</dd></div>
                    <div className="flex justify-between"><dt>Service fee</dt><dd>{money(o.serviceFee)}</dd></div>
                    <div className="flex justify-between"><dt>Delivery to {o.city}{o.region ? `, ${o.region}` : ''}</dt><dd>{money(o.deliveryFee)}</dd></div>
                    <div className="flex justify-between border-t border-gray-100 pt-1.5 text-[14px] font-black text-[#151515]"><dt>Total</dt><dd>{money(o.total)}</dd></div>
                  </dl>
                  {o.gps && <p className="mt-2 text-[11px] text-[#999]">Delivering to GhanaPost GPS {o.gps}</p>}

                  {o.refund && <div className="mt-3"><RefundNote r={o.refund} /></div>}
                  {o.status === 'delivered' && !openRefund && (daysLeft ?? 0) === 0 && !o.refund && (
                    <p className="mt-3 text-[12px] text-[#999]"><XCircle size={12} className="inline mr-1" />The {POLICY.returnWindowDays}-day return window has passed. Open a support ticket if something is wrong.</p>
                  )}
                  {o.status === 'delivered' && canRefund && daysLeft != null && (
                    <p className="mt-3 text-[12px] text-[#555]"><CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />{daysLeft} day{daysLeft === 1 ? '' : 's'} left to request a return.</p>
                  )}
                </div>

                {refundFor === o.id && (
                  <div className="border-t border-gray-100 bg-[#fafafa] px-4 py-3 space-y-2">
                    <label htmlFor={`why-${o.id}`} className="block text-[11px] font-black text-[#555]">
                      {kind === 'not_received' ? 'Tell us about the missing delivery' : 'What is wrong with the item?'}
                    </label>
                    <textarea
                      id={`why-${o.id}`}
                      rows={3}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={kind === 'not_received' ? 'e.g. It says shipped 6 days ago but nobody has called me.' : 'e.g. The screen was cracked when I opened the box.'}
                      className="w-full rounded border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-[#f04438] resize-none bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === o.id || reason.trim().length < 10}
                        onClick={() => run(o.id, () => requestOrderRefund(o.id, kind, reason.trim()), 'Request sent. We will update this page.')}
                        className="h-10 rounded bg-[#f04438] px-5 text-[12px] font-black text-white hover:bg-[#c0392b] transition-colors disabled:opacity-50"
                      >
                        {busy === o.id ? 'Sending…' : 'Send request'}
                      </button>
                      <button type="button" onClick={() => { setRefundFor(null); setReason(''); }} className="h-10 rounded border border-gray-200 px-4 text-[12px] font-bold text-[#555] bg-white">Cancel</button>
                    </div>
                    <p className="text-[11px] text-[#999]">Use at least 10 characters. Photos can be added to a support ticket afterwards.</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => receipt(o)}
                    disabled={busy === `r-${o.id}`}
                    className="h-9 rounded border border-gray-200 px-3 text-[11px] font-black text-[#555] hover:border-[#151515] hover:text-[#151515] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Download size={13} /> {busy === `r-${o.id}` ? 'Preparing…' : 'Receipt (PDF)'}
                  </button>
                  <Link href={`/support?order=${o.id}`} className="h-9 rounded border border-gray-200 px-3 text-[11px] font-black text-[#555] hover:border-[#151515] hover:text-[#151515] transition-colors flex items-center gap-1.5">
                    <LifeBuoy size={13} /> Report a problem
                  </Link>
                  {canCancel && (
                    <button type="button" onClick={() => cancel(o)} disabled={busy === o.id} className="h-9 rounded border border-red-200 px-3 text-[11px] font-black text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                      Cancel order
                    </button>
                  )}
                  {canRefund && refundFor !== o.id && (
                    <button type="button" onClick={() => { setRefundFor(o.id); setReason(''); }} className="h-9 rounded bg-[#151515] px-3 text-[11px] font-black text-white hover:bg-[#f04438] transition-colors">
                      {kind === 'not_received' ? 'Not received? Request refund' : 'Request return / refund'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
