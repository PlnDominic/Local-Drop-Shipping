import { api } from './client';
import type {
  CreateOrderPayload,
  Order,
  PaginatedData,
  UpdateOrderStatusPayload,
} from './types';

export const ordersApi = {
  /** [Customer] Place a new order */
  create: (payload: CreateOrderPayload): Promise<Order> =>
    api.post<Order>('/orders', payload),

  /** [Auth] List orders for the authenticated user (customer view) */
  list: (page = 1, limit = 20): Promise<PaginatedData<Order>> =>
    api.get<PaginatedData<Order>>('/orders', { params: { page, limit } }),

  /** [Auth] Get a single order by ID */
  getById: (id: string): Promise<Order> =>
    api.get<Order>(`/orders/${id}`),

  /** [Supplier | Admin] Update the status of an order */
  updateStatus: (id: string, payload: UpdateOrderStatusPayload): Promise<Order> =>
    api.patch<Order>(`/orders/${id}/status`, payload),

  /** [Supplier] List orders that belong to this supplier for fulfillment */
  listForSupplier: (page = 1, limit = 20): Promise<PaginatedData<Order>> =>
    api.get<PaginatedData<Order>>('/orders/supplier', { params: { page, limit } }),

  /** [Dropshipper] List orders originating from this dropshipper's store */
  listForDropshipper: (page = 1, limit = 20): Promise<PaginatedData<Order>> =>
    api.get<PaginatedData<Order>>('/orders/dropshipper', { params: { page, limit } }),
};
