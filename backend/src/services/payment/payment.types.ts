import { BookingEntity, PaymentStatus } from '../../models/booking.model';

export type PaymentMethodType =
  | 'credit_card'
  | 'debit_card'
  | 'mock_card'
  | 'bank_transfer'
  | 'wallet';

export interface CreatePaymentIntentInput {
  bookingId: string;
  bookingReference: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  provider: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
}

/**
 * Non-sensitive payment method details.
 * CRITICAL SECURITY: Never store, log, or persist raw PAN, CVV, or full card details.
 */
export interface SafePaymentMethodDetails {
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface ConfirmPaymentInput {
  bookingId: string;
  paymentIntentId: string;
  paymentMethod?: PaymentMethodType | string;
  paymentMethodDetails?: SafePaymentMethodDetails;
  simulateFailure?: boolean;
  failureReason?: string;
}

export interface PaymentExecutionResult {
  success: boolean;
  transactionReference: string;
  paymentIntentId: string;
  provider: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed';
  errorMessage?: string;
  paidAt?: Date;
  gatewayResponse: Record<string, unknown>;
}

export interface PaymentRecordEntity {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_reference: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  refund_amount: number;
  gateway_response: Record<string, unknown>;
  paid_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}
