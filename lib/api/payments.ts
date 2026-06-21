import { api } from './client';
import type { InitiatePaymentPayload, PaginatedData, PaymentRecord } from './types';

export const paymentsApi = {
  /** Initiate a MoMo / card payment for an order */
  initiate: (payload: InitiatePaymentPayload): Promise<{ reference: string; redirectUrl?: string }> =>
    api.post<{ reference: string; redirectUrl?: string }>('/payments/initiate', payload),

  /** Poll / verify payment status by reference */
  verify: (ref: string): Promise<PaymentRecord> =>
    api.get<PaymentRecord>(`/payments/verify/${ref}`),

  /** List the authenticated user's payment history */
  history: (page = 1, limit = 20): Promise<PaginatedData<PaymentRecord>> =>
    api.get<PaginatedData<PaymentRecord>>('/payments/history', { params: { page, limit } }),

  /**
   * Webhook handler — called server-side by the payment gateway.
   * Exposed here so the backend service layer can be called from a Next.js
   * API route (/api/payments/webhook) that proxies the gateway callback.
   */
  webhook: (payload: unknown): Promise<{ received: boolean }> =>
    api.post<{ received: boolean }>('/payments/webhook', payload, { skipAuth: true }),
};
