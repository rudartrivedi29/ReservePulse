import { z } from 'zod';

export const userRoleEnum = z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN', 'customer', 'organiser', 'admin']);
export const publicSignupRoleEnum = z.enum(['CUSTOMER', 'ORGANISER', 'customer', 'organiser']);

export const signupSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  role: publicSignupRoleEnum.default('CUSTOMER').transform((val) => val.toUpperCase() as 'CUSTOMER' | 'ORGANISER'),
  phone: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
  otp: z
    .string()
    .trim()
    .min(4, 'OTP code must be at least 4 characters')
    .max(10, 'OTP code cannot exceed 10 characters'),
});

export const resendOtpSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
  token: z
    .string()
    .trim()
    .min(4, 'Reset token/OTP must be at least 4 characters'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
