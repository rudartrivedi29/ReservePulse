import { apiClient } from './api';
import type { ApiResponse } from '../types';
import type { BookingItem, PaymentIntentResponse, PaymentSummaryResponse } from './booking.service';

export interface SafeCardDetails {
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface ConfirmPaymentPayload {
  paymentIntentId: string;
  paymentMethod?: string;
  simulateFailure?: boolean;
  failureReason?: string;
  cardDetails?: SafeCardDetails;
}

export interface PaymentExecutionResult {
  booking: BookingItem;
  payment: {
    id: string;
    booking_id: string;
    amount: number;
    currency: string;
    payment_method: string;
    transaction_reference: string;
    status: 'completed' | 'failed';
    paid_at?: string;
  };
  success: boolean;
  errorMessage?: string;
}

export interface BookingPaymentAuditDetails {
  payments: Array<{
    id: string;
    booking_id: string;
    amount: number;
    currency: string;
    payment_method: string;
    transaction_reference: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    paid_at?: string;
    created_at: string;
  }>;
  paymentSummary?: PaymentSummaryResponse;
  activeIntent?: PaymentIntentResponse | null;
}

export const paymentClient = {
  /**
   * Request/generate a payment intent for a booking requiring advance payment
   */
  async createPaymentIntent(bookingIdOrReference: string): Promise<ApiResponse<PaymentIntentResponse>> {
    return apiClient.post<PaymentIntentResponse>(`/bookings/${bookingIdOrReference}/payment-intent`, {});
  },

  /**
   * Safely confirm/capture payment for a booking without transmitting or storing raw PAN/CVV
   */
  async confirmPayment(
    bookingIdOrReference: string,
    payload: ConfirmPaymentPayload
  ): Promise<ApiResponse<PaymentExecutionResult>> {
    return apiClient.post<PaymentExecutionResult>(
      `/bookings/${bookingIdOrReference}/confirm-payment`,
      payload
    );
  },

  /**
   * Fetch payment audit records and payment status for a booking
   */
  async getPaymentDetails(
    bookingIdOrReference: string
  ): Promise<ApiResponse<BookingPaymentAuditDetails>> {
    return apiClient.get<BookingPaymentAuditDetails>(`/bookings/${bookingIdOrReference}/payment`);
  },
};
