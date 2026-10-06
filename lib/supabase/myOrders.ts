import { supabase } from './client';
import { POLICY } from '../site';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type RefundKind = 'return' | 'not_received';
export type RefundStatus = 'requested' | 'approved' | 'rejected' | 'completed';

export interface RefundRequest {
  id: string;
  orderId: string;
  kind: RefundKind;
  reason: string;
  status: RefundStatus;
  refundAmount: number | null;
  adminNote: string | null;
  createdAt: string;
  customerRefundedAt: string | null;
}

export interface MyOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  storeName: string;
  region: string;
  city: string;
  gps: string;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  deliveryMinDays: number | null;
  deliveryMaxDays: number | null;
  items: { id: string; name: string; quantity: number; unitPrice: number; image?: string }[];
  refund: RefundRequest | null;
}

interface OrderRow {
  id: string;
  order_number: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  customer_region: string | null;
  customer_city: string | null;
  customer_ghana_post_gps: string | null;
  subtotal: number | string;
  platform_fee: number | string | null;
  delivery_fee: number | string | null;
  total: number | string;
  delivery_min_days: number | null;
  delivery_max_days: number | null;
  dropshipper_profiles?: { store_name: string | null } | null;
  order_items?: {
    id: string;
    quantity: number;
    unit_price: number | string;
    products?: { name: string; images: string[] | null } | null;
  }[];
}

interface RefundRow {
  id: string;
  order_id: string;
  kind: RefundKind;
  reason: string;
  status: RefundStatus;
  refund_amount: number | string | null;
  admin_note: string | null;
  created_at: string;
  customer_refunded_at: string | null;
}

export async function getMyOrders(userId: string): Promise<MyOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, dropshipper_profiles(store_name), order_items(id, quantity, unit_price, products(name, images))')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = data as unknown as OrderRow[];

  const refunds = new Map<string, RefundRequest>();
  if (rows.length) {
    // The newest request per order wins (older ones were rejected or completed).
    const { data: rr } = await supabase
      .from('refund_requests')
      .select('id, order_id, kind, reason, status, refund_amount, admin_note, created_at, customer_refunded_at')
      .in('order_id', rows.map((r) => r.id))
      .order('created_at', { ascending: true });
    for (const r of (rr as RefundRow[] | null) ?? []) {
      refunds.set(r.order_id, {
        id: r.id,
        orderId: r.order_id,
        kind: r.kind,
        reason: r.reason,
        status: r.status,
        refundAmount: r.refund_amount == null ? null : Number(r.refund_amount),
        adminNote: r.admin_note,
        createdAt: r.created_at,
        customerRefundedAt: r.customer_refunded_at,
      });
    }
  }

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.order_number ?? o.id.slice(0, 8).toUpperCase(),
    status: o.status,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    deliveredAt: o.delivered_at,
    storeName: o.dropshipper_profiles?.store_name ?? '',
    region: o.customer_region ?? '',
    city: o.customer_city ?? '',
    gps: o.customer_ghana_post_gps ?? '',
    subtotal: Number(o.subtotal),
    serviceFee: Number(o.platform_fee ?? 0),
    deliveryFee: Number(o.delivery_fee ?? 0),
    total: Number(o.total),
    deliveryMinDays: o.delivery_min_days,
    deliveryMaxDays: o.delivery_max_days,
    items: (o.order_items ?? []).map((it) => ({
      id: it.id,
      name: it.products?.name ?? 'Product',
      quantity: it.quantity,
      unitPrice: Number(it.unit_price),
      image: it.products?.images?.[0],
    })),
    refund: refunds.get(o.id) ?? null,
  }));
}

export async function cancelMyOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId, p_reason: reason || null });
  if (error) throw error;
}

export async function requestOrderRefund(orderId: string, kind: RefundKind, reason: string): Promise<void> {
  const { error } = await supabase.rpc('request_refund', { p_order_id: orderId, p_kind: kind, p_reason: reason });
  if (error) throw error;
}

/** Days left to ask for a return after delivery (null when it doesn't apply). */
export function returnDaysLeft(o: Pick<MyOrder, 'status' | 'deliveredAt' | 'updatedAt'>): number | null {
  if (o.status !== 'delivered') return null;
  const from = new Date(o.deliveredAt ?? o.updatedAt).getTime();
  const left = POLICY.returnWindowDays - (Date.now() - from) / 86_400_000;
  return Math.max(0, Math.ceil(left));
}
