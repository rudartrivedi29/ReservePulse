import { z } from 'zod';

export const appointmentTypeEnum = z.enum(['individual', 'group', 'resource_constrained']);
export const paymentSettingEnum = z.enum(['free', 'paid', 'pay_in_person']);
export const resourceAssignmentModeEnum = z.enum(['automatic', 'manual', 'any_available', 'single_resource']);

export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Service name must be at least 2 characters')
    .max(100, 'Service name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .default(''),
  category: z
    .string()
    .trim()
    .max(50, 'Category cannot exceed 50 characters')
    .default('General'),
  durationMinutes: z
    .number()
    .int('Duration must be a whole number of minutes')
    .min(5, 'Duration must be at least 5 minutes')
    .max(1440, 'Duration cannot exceed 24 hours (1440 minutes)'),
  capacityType: appointmentTypeEnum.default('individual'),
  defaultCapacity: z
    .number()
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .default(1),
  paymentSetting: paymentSettingEnum.default('free'),
  priceAmount: z
    .number()
    .min(0, 'Price must be non-negative')
    .default(0),
  priceCurrency: z
    .string()
    .trim()
    .length(3, 'Currency code must be 3 letters (e.g. USD)')
    .toUpperCase()
    .default('USD'),
  requiresManualConfirmation: z
    .boolean()
    .default(false),
  resourceAssignmentMode: resourceAssignmentModeEnum.default('automatic'),
  bufferBeforeMinutes: z
    .number()
    .int()
    .min(0, 'Buffer before must be non-negative')
    .default(0),
  bufferAfterMinutes: z
    .number()
    .int()
    .min(0, 'Buffer after must be non-negative')
    .default(0),
  maxAdvanceBookingDays: z
    .number()
    .int()
    .min(1, 'Advance booking days must be at least 1')
    .default(30),
  minLeadTimeHours: z
    .number()
    .int()
    .min(0, 'Lead time must be non-negative')
    .default(1),
  isPublished: z
    .boolean()
    .default(false),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
