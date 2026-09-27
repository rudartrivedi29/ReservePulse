import { z } from 'zod';

export const bookingAnswerInputSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  answerText: z.string().default(''),
});

export const createBookingSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  resourceId: z.string().min(1, 'Resource / Provider ID is required'),
  startDateTime: z.string().datetime({ message: 'Valid UTC ISO start datetime is required' }),
  endDateTime: z.string().datetime({ message: 'Valid UTC ISO end datetime is required' }).optional(),
  slotId: z.string().optional(),
  attendeeCount: z.coerce.number().int().positive().default(1),
  customerName: z.string().min(1, 'Customer name is required').max(255).optional(),
  customerEmail: z.string().email('Valid customer email is required').optional(),
  customerPhone: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  answers: z.array(bookingAnswerInputSchema).default([]),
  idempotencyKey: z.string().max(128).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const confirmBookingSchema = z.object({
  notes: z.string().max(2000).optional(),
  markPaymentPaid: z.boolean().default(false).optional(),
});

export const listBookingsQuerySchema = z.object({
  status: z
    .enum([
      'all',
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'payment-failed',
      'payment_failed',
    ])
    .default('all')
    .optional(),
  timeFilter: z
    .enum(['all', 'upcoming', 'past', 'today', 'this_week'])
    .default('all')
    .optional(),
  search: z.string().trim().max(100).optional(),
  serviceId: z.string().optional(),
  resourceId: z.string().optional(),
  organiserId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
