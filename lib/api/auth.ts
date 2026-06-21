import { api, tokenStore } from './client';
import type {
  AuthTokens,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UserProfile,
} from './types';

export const authApi = {
  /** Register a new user account */
  register: (payload: RegisterPayload): Promise<AuthTokens> =>
    api.post<AuthTokens>('/auth/register', payload, { skipAuth: true }),

  /** Login and receive tokens; automatically persists them */
  login: async (payload: LoginPayload): Promise<{ tokens: AuthTokens; user: UserProfile }> => {
    const result = await api.post<{ tokens: AuthTokens; user: UserProfile }>(
      '/auth/login',
      payload,
      { skipAuth: true },
    );
    tokenStore.set(result.tokens);
    return result;
  },

  /** Logout from the server and clear local tokens */
  logout: async (): Promise<void> => {
    try {
      await api.post<void>('/auth/logout');
    } finally {
      tokenStore.clear();
    }
  },

  /** Manually refresh the access token */
  refreshToken: async (): Promise<AuthTokens> => {
    const refreshToken = tokenStore.getRefresh();
    const result = await api.post<AuthTokens>(
      '/auth/refresh-token',
      { refreshToken },
      { skipAuth: true },
    );
    tokenStore.set(result);
    return result;
  },

  /** Send password-reset email */
  forgotPassword: (payload: ForgotPasswordPayload): Promise<{ message: string }> =>
    api.post<{ message: string }>('/auth/forgot-password', payload, { skipAuth: true }),

  /** Complete password reset with token from email */
  resetPassword: (payload: ResetPasswordPayload): Promise<{ message: string }> =>
    api.post<{ message: string }>('/auth/reset-password', payload, { skipAuth: true }),

  /** True if there is a stored access token */
  isAuthenticated: (): boolean => tokenStore.getAccess() !== null,
};
