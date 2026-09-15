'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { EstimatedDelivery } from '../components/EstimatedDelivery';
import {
  Search,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  MapPin,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-purple-50 text-purple-700',
  shipped: 'bg-[#f04438]/10 text-[#c0392b]',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-gray-100 text-gray-500',
};

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export const TrackOrder: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundOrder, setFoundOrder] = useState<{
    id: string;
    order_number: string | null;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    status: string;
    subtotal: number;
    platform_fee: number;
    total: number;
    estimated_delivery: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    dropshipper_profiles?: { business_name: string | null } | null;
    order_items?: Array<{
      id: string;
      product_id: string | null;
      quantity: number;
      unit_price: number;
      subtotal: number;
      products?: { name: string; cost_price: number } | null;
    }>;
  } | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() && !phone.trim()) {
      setError('Enter an order number or phone number to track.');
      return;
    }
    setLoading(true);
    setError('');
    setFoundOrder(null);

    let query = supabase.from('orders').select('*, dropshipper_profiles(business_name), order_items(*, products(name, cost_price))');

    if (orderNumber.trim()) {
      query = query.eq('order_number', orderNumber.trim());
    } else {
      query = query.eq('customer_phone', phone.trim());
    }

    const { data, error: err } = await query.order('created_at', { ascending: false }).limit(1);

    setLoading(false);

    if (err || !data || data.length === 0) {
      setError('No order found. Please check your order number or phone number.');
      return;
    }

    setFoundOrder(data[0] as typeof foundOrder);
  };

  return (
    <main className="min-h-screen bg-[#f4f4f4] text-[#1c1c1c]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-[#777] hover:text-[#f04438] transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-[#151515]">Track Your Order</h1>
          <p className="mt-1 text-sm text-[#777]">Enter your order number or phone number to track your delivery.</p>
        </div>

        <form onSubmit={handleTrack} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black text-[#777] uppercase tracking-wider">Order Number</span>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => { setOrderNumber(e.target.value); setError(''); }}
                placeholder="e.g. ABCD1234"
                className="h-11 rounded border border-gray-200 px-4 text-sm text-[#1c1c1c] outline-none focus:border-[#f04438]"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black text-[#777] uppercase tracking-wider">Phone Number</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(''); }}
                placeholder="e.g. +233244123456"
                className="h-11 rounded border border-gray-200 px-4 text-sm text-[#1c1c1c] outline-none focus:border-[#f04438]"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-[#f04438] text-sm font-black text-white hover:bg-[#c0392b] transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Tracking…
              </>
            ) : (
              <>
                <Search size={16} />
                Track Order
              </>
            )}
          </button>

          {error && (
            <div className="rounded bg-red-50 px-3 py-2.5 text-xs text-red-700 border border-red-100 flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </form>

        {foundOrder && (
          <div className="mt-6 space-y-4">
            {/* Order Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[#777] font-black uppercase tracking-wider">Order</p>
                  <p className="text-lg font-black text-[#f04438] mt-0.5">
                    {foundOrder.order_number ?? foundOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded ${STATUS_STYLE[foundOrder.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {foundOrder.status}
                </span>
              </div>
            </div>

            {/* Estimated Delivery - Prominent */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Truck size={18} className="text-[#f04438]" />
                <h2 className="text-sm font-black text-[#151515]">Estimated Delivery</h2>
              </div>
              <EstimatedDelivery estimate={foundOrder.estimated_delivery} loading={false} />
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-black text-[#151515] mb-4">Order Status</h2>
              <div className="space-y-3">
                {STATUS_FLOW.map((status, idx) => {
                  const currentIdx = STATUS_FLOW.indexOf(foundOrder.status);
                  const isActive = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 rounded-full place-items-center shrink-0 ${
                        isActive ? 'bg-[#f04438] text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isActive ? (
                          idx < currentIdx ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Clock size={14} />
                          )
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-black capitalize ${isActive ? 'text-[#151515]' : 'text-gray-400'}`}>
                          {status}
                        </p>
                        {isCurrent && (
                          <p className="text-[10px] text-[#f04438] font-black uppercase tracking-wider">Current</p>
                        )}
                      </div>
                      {isActive && idx < STATUS_FLOW.length - 1 && (
                        <div className="flex-1 h-0.5 bg-[#f04438]/30 rounded ml-[-6px] mt-4" />
                      )}
                    </div>
                  );
                })}
                {foundOrder.status === 'cancelled' || foundOrder.status === 'refunded' ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 rounded-full place-items-center shrink-0 bg-red-500 text-white">
                      <XCircle size={14} />
                    </div>
                    <p className="text-sm font-black text-red-700 capitalize">{foundOrder.status}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-black text-[#151515]">Order Details</h2>

              <div className="flex items-center gap-2 text-sm text-[#555]">
                <MapPin size={14} className="shrink-0" />
                <span>{foundOrder.customer_address || '—'}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-[#555]">
                <Phone size={14} className="shrink-0" />
                <span>{foundOrder.customer_phone}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-[#555]">
                <Calendar size={14} className="shrink-0" />
                <span>Placed {new Date(foundOrder.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>

              {foundOrder.notes && (
                <div className="rounded bg-gray-50 px-3 py-2 text-xs text-[#555]">
                  <span className="font-black">Note:</span> {foundOrder.notes}
                </div>
              )}

              {foundOrder.order_items && foundOrder.order_items.length > 0 && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {foundOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-[#555]">
                        {item.products?.name ?? 'Product'} × {item.quantity}
                      </span>
                      <span className="font-black text-[#151515]">GHS {(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-[#777]">
                  <span>Subtotal</span>
                  <span>GHS {(foundOrder.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-[#777]">
                  <span>Platform Fee</span>
                  <span>GHS {(foundOrder.platform_fee ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-1">
                  <span>Total</span>
                  <span>GHS {(foundOrder.total ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {foundOrder.dropshipper_profiles?.business_name && (
                <p className="text-[10px] text-[#999] pt-1">Fulfilled by {foundOrder.dropshipper_profiles.business_name}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
