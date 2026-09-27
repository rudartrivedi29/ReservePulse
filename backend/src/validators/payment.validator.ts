import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  idempotencyKey: z.string().uuid().optional(),
});

/**
 * Safe Payment Confirmation Schema
 * Strictly forbids raw PAN or CVV input. Only tokenized intent ID and safe metadata are accepted.
 */
export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment Intent ID is required'),
  paymentMethod: z.string().default('credit_card'),
  simulateFailure: z.boolean().optional(),
  failureReason: z.string().optional(),
  cardDetails: z
    .object({
      brand: z.string().optional(),
      last4: z.string().length(4, 'Last 4 digits must be exactly 4 digits').optional(),
      expiryMonth: z.number().int().min(1).max(12).optional(),
      expiryYear: z.number().int().min(2024).max(2040).optional(),
    })
    .optional(),
});

export type ConfirmPaymentPayload = z.infer<typeof confirmPaymentSchema>;
