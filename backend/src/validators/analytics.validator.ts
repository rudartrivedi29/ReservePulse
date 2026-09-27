import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  timeFilter: z.enum(['today', 'week', 'month', 'custom']).optional().default('week'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  organiserId: z.string().optional(),
  resourceId: z.string().optional(),
  serviceId: z.string().optional(),
});

export type AnalyticsQuery = z.input<typeof analyticsQuerySchema>;
export type AnalyticsParsedQuery = z.output<typeof analyticsQuerySchema>;
