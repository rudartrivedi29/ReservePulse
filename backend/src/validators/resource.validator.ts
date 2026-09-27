import { z } from 'zod';

export const resourceTypeEnum = z.enum([
  'staff',
  'room',
  'compute',
  'equipment',
  'pod',
  'studio',
  'vehicle',
  'other',
]);

export const resourceStatusEnum = z.enum([
  'active',
  'inactive',
  'operational',
  'maintenance',
  'decommissioned',
]);

export const createResourceSchema = z.object({
  name: z
    .string()
    .min(2, 'Resource name must be at least 2 characters')
    .max(255, 'Resource name must not exceed 255 characters'),
  resourceType: resourceTypeEnum,
  description: z.string().optional().default(''),
  location: z.string().optional().default(''),
  capacity: z
    .number()
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1')
    .default(1),
  status: resourceStatusEnum.optional().default('active'),
  serviceIds: z.array(z.string()).optional().default([]),
});

export const updateResourceSchema = createResourceSchema.partial();

export const assignServiceSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  isRequired: z.boolean().optional().default(true),
  allocationQuantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .optional()
    .default(1),
});

export const setResourceServicesSchema = z.object({
  serviceIds: z.array(z.string()),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type AssignServiceInput = z.infer<typeof assignServiceSchema>;
export type SetResourceServicesInput = z.infer<typeof setResourceServicesSchema>;
