import { api } from './client';
import type { PaginatedData, Transaction, WalletBalance, WithdrawPayload } from './types';

export const walletApi = {
  /** Get the authenticated user's wallet balance */
  getBalance: (): Promise<WalletBalance> =>
    api.get<WalletBalance>('/wallet/balance'),

  /** Withdraw funds to a MoMo number */
  withdraw: (payload: WithdrawPayload): Promise<{ reference: string; message: string }> =>
    api.post<{ reference: string; message: string }>('/wallet/withdraw', payload),

  /** List wallet transactions with pagination */
  getTransactions: (page = 1, limit = 20): Promise<PaginatedData<Transaction>> =>
    api.get<PaginatedData<Transaction>>('/wallet/transactions', {
      params: { page, limit },
    }),
};
