import { z } from 'zod';

export const serviceAvailabilityQuerySchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format'),
    resourceId: z.string().optional(),
    slotStep: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(
        z.number().int().min(5, 'slotStep must be at least 5 minutes').max(480, 'slotStep cannot exceed 480 minutes').optional()
      ),
    attendees: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(
        z.number().int().min(1, 'attendees count must be at least 1').max(100, 'attendees count cannot exceed 100')
      ),
    shareToken: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date values provided',
        path: ['startDate'],
      });
      return;
    }

    if (start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate must be earlier than or equal to endDate',
        path: ['startDate'],
      });
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date range cannot exceed 90 days',
        path: ['endDate'],
      });
    }
  });

export type ServiceAvailabilityQuery = z.infer<typeof serviceAvailabilityQuerySchema>;
