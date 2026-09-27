import { apiClient } from './api';
import type { ApiResponse } from '../types';

export type UserRole = 'CUSTOMER' | 'ORGANISER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionData {
  user: AuthUser;
  token: string;
  requiresOtp?: boolean;
  otp?: string;
  message?: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  newPassword: string;
}

export const authService = {
  /**
   * Register new user account
   */
  async signup(payload: SignupPayload): Promise<ApiResponse<AuthSessionData>> {
    return apiClient.post<AuthSessionData>('/auth/signup', payload);
  },

  /**
   * Login with email & password
   */
  async login(payload: LoginPayload): Promise<ApiResponse<AuthSessionData>> {
    return apiClient.post<AuthSessionData>('/auth/login', payload);
  },

  /**
   * Verify email OTP
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<ApiResponse<AuthSessionData>> {
    return apiClient.post<AuthSessionData>('/auth/verify-otp', payload);
  },

  /**
   * Resend OTP code
   */
  async resendOtp(email: string): Promise<ApiResponse<{ otp: string; message: string }>> {
    return apiClient.post<{ otp: string; message: string }>('/auth/resend-otp', { email });
  },

  /**
   * Request password reset code
   */
  async forgotPassword(email: string): Promise<ApiResponse<{ resetToken?: string; message: string }>> {
    return apiClient.post<{ resetToken?: string; message: string }>('/auth/forgot-password', { email });
  },

  /**
   * Reset password with code/token
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/reset-password', payload);
  },

  /**
   * Get current authenticated user profile
   */
  async getMe(): Promise<ApiResponse<AuthUser>> {
    return apiClient.get<AuthUser>('/auth/me');
  },
};
