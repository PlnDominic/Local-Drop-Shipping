export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItemEntity {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderEntity {
  id: string;
  dropshipper_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: OrderStatus;
  subtotal: number;
  platform_fee: number;
  total: number;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItemEntity[];
}
