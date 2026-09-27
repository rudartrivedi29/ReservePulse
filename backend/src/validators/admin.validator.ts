import { z } from 'zod';

export const adminUserRoleEnum = z.enum([
  'ALL',
  'CUSTOMER',
  'ORGANISER',
  'ADMIN',
  'customer',
  'organiser',
  'admin',
  'all',
]);

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: adminUserRoleEnum.optional().default('ALL'),
  status: z.enum(['all', 'active', 'deactivated', 'inactive']).optional().default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'email', 'role']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListUsersQuery = z.input<typeof listUsersQuerySchema>;

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().optional(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN', 'customer', 'organiser', 'admin']),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const createAdminUserInputSchema = z.object({
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  fullName: z.string().min(2, 'Full name must have at least 2 characters').trim(),
  role: z.enum(['CUSTOMER', 'ORGANISER', 'ADMIN', 'customer', 'organiser', 'admin']).default('CUSTOMER'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserInputSchema>;
