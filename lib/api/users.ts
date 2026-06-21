import { api } from './client';
import type { PaginatedData, UpdateProfilePayload, UserProfile } from './types';

export const usersApi = {
  /** Get the authenticated user's profile */
  getProfile: (): Promise<UserProfile> =>
    api.get<UserProfile>('/users/profile'),

  /** Update the authenticated user's profile */
  updateProfile: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    api.patch<UserProfile>('/users/profile', payload),

  /** [Admin] Get a specific user by ID */
  getUserById: (id: string): Promise<UserProfile> =>
    api.get<UserProfile>(`/users/${id}`),

  /** [Admin] List all users with pagination */
  listUsers: (page = 1, limit = 20): Promise<PaginatedData<UserProfile>> =>
    api.get<PaginatedData<UserProfile>>('/users', { params: { page, limit } }),
};
