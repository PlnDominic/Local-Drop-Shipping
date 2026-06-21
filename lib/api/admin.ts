import { api } from './client';
import type {
  AdminReport,
  Commission,
  PaginatedData,
  SupplierApprovalPayload,
  UserProfile,
} from './types';

export const adminApi = {
  /** [Admin] List all users on the platform */
  listUsers: (page = 1, limit = 20): Promise<PaginatedData<UserProfile>> =>
    api.get<PaginatedData<UserProfile>>('/admin/users', { params: { page, limit } }),

  /** [Admin] Approve or reject a supplier registration */
  approveSupplier: (
    supplierId: string,
    payload: SupplierApprovalPayload,
  ): Promise<{ message: string }> =>
    api.patch<{ message: string }>(`/admin/suppliers/${supplierId}/approve`, payload),

  /** [Admin] Platform-wide revenue and user report */
  getReports: (): Promise<AdminReport> =>
    api.get<AdminReport>('/admin/reports'),

  /** [Admin] List all commissions across dropshippers */
  getCommissions: (page = 1, limit = 20): Promise<PaginatedData<Commission>> =>
    api.get<PaginatedData<Commission>>('/admin/commissions', { params: { page, limit } }),
};
