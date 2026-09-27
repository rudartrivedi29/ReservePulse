import crypto from 'crypto';
import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { AuthUserPayload } from '../../middleware/auth.middleware';
import {
  BookingEntity,
  BookingResponse,
  PaymentIntentResponse,
  PaymentSummaryResponse,
} from '../../models/booking.model';
import {
  ConfirmPaymentInput,
  PaymentExecutionResult,
  PaymentRecordEntity,
} from './payment.types';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { SlotEngineService } from '../slot-engine.service';
import { ServiceService } from '../service.service';

// In-memory payment ledger fallback for testing / non-DB environments
const inMemoryPayments: Map<string, PaymentRecordEntity[]> = new Map();
const inMemoryIntents: Map<string, PaymentIntentResponse> = new Map();

export class PaymentService {
  private static dbConnectedCache: { connected: boolean; checkedAt: number } | null = null;

  /**
   * Helper: check database connectivity
   */
  private static async isDbConnected(): Promise<boolean> {
    const now = Date.now();
    if (this.dbConnectedCache && now - this.dbConnectedCache.checkedAt < 5000) {
      return this.dbConnectedCache.connected;
    }
    try {
      const res = await db.query('SELECT 1');
      const isOk = Boolean(res);
      this.dbConnectedCache = { connected: isOk, checkedAt: now };
      return isOk;
    } catch {
      this.dbConnectedCache = { connected: false, checkedAt: now };
      return false;
    }
  }

  /**
   * Determine if advance payment is required for a service and price amount
   */
  public static isAdvancePaymentRequired(
    paymentSetting: string | undefined,
    totalPrice: number
  ): boolean {
    return paymentSetting === 'paid' && totalPrice > 0;
  }

  /**
   * Create or retrieve an existing payment intent for a booking entity
   */
  public static async createPaymentIntentForBooking(
    booking: {
      id: string;
      booking_reference: string;
      service_id: string;
      total_price: number;
      price_currency: string;
      guest_email?: string | null;
      guest_name?: string | null;
    },
    servicePaymentSetting: string
  ): Promise<PaymentIntentResponse | null> {
    const required = this.isAdvancePaymentRequired(
      servicePaymentSetting,
      Number(booking.total_price)
    );

    if (!required) {
      return null;
    }

    const provider = PaymentProviderRegistry.getProvider();

    const intentResult = await provider.createPaymentIntent({
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      amount: Number(booking.total_price),
      currency: booking.price_currency,
      customerEmail: booking.guest_email || undefined,
      customerName: booking.guest_name || undefined,
      metadata: {
        serviceId: booking.service_id,
        bookingReference: booking.booking_reference,
      },
    });

    const response: PaymentIntentResponse = {
      paymentIntentId: intentResult.paymentIntentId,
      clientSecret: intentResult.clientSecret,
      provider: intentResult.provider,
      amount: intentResult.amount,
      currency: intentResult.currency,
      status: intentResult.status,
      requiresAdvancePayment: true,
    };

    inMemoryIntents.set(booking.id, response);
    return response;
  }

  /**
   * Create a payment intent by booking ID or Reference (API Endpoint)
   */
  public static async createIntentForBookingId(
    idOrReference: string,
    authUser?: AuthUserPayload
  ): Promise<PaymentIntentResponse> {
    // Dynamic import of BookingService to prevent circular dependency
    const { BookingService } = await import('../booking.service');
    const booking = await BookingService.getBookingByIdOrReference(idOrReference);

    if (booking.status === 'cancelled') {
      throw new BadRequestError('Cannot create payment intent for a cancelled booking');
    }

    if (booking.paymentStatus === 'paid') {
      throw new BadRequestError('Booking has already been paid and confirmed');
    }

    // Role & Ownership check for authenticated customers
    if (authUser && (authUser.role || '').toUpperCase() === 'CUSTOMER') {
      if (booking.customerId && booking.customerId !== authUser.id) {
        throw new ForbiddenError('Access denied: You can only create payment intents for your own reservations');
      }
    }

    // Lookup service to check advance payment configuration
    const service = await ServiceService.getServiceById(booking.serviceId);
    const required = this.isAdvancePaymentRequired(
      service.paymentSetting,
      booking.totalPrice
    );

    if (!required) {
      throw new BadRequestError(
        'Advance payment is not enabled for this service. Booking is confirmed without payment.'
      );
    }

    // Return existing active intent if already initialized
    const existingIntent = inMemoryIntents.get(booking.id);
    if (existingIntent && existingIntent.status !== 'failed') {
      return existingIntent;
    }

    const provider = PaymentProviderRegistry.getProvider();
    const intentResult = await provider.createPaymentIntent({
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      amount: booking.totalPrice,
      currency: booking.priceCurrency,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      metadata: {
        serviceId: booking.serviceId,
        bookingReference: booking.bookingReference,
      },
    });

    const response: PaymentIntentResponse = {
      paymentIntentId: intentResult.paymentIntentId,
      clientSecret: intentResult.clientSecret,
      provider: intentResult.provider,
      amount: intentResult.amount,
      currency: intentResult.currency,
      status: intentResult.status,
      requiresAdvancePayment: true,
    };

    inMemoryIntents.set(booking.id, response);

    // Update booking payment_status to 'pending' if it was 'unpaid'
    await BookingService.updateBookingPaymentState(booking.id, 'pending', booking.status);

    return response;
  }

  /**
   * Confirm/Capture Payment for a Booking
   * Safely marks booking states for pending, confirmed, cancelled, or payment-failed.
   * NEVER accepts or persists sensitive PAN/CVV card data.
   */
  public static async confirmPayment(
    idOrReference: string,
    input: {
      paymentIntentId: string;
      paymentMethod?: string;
      simulateFailure?: boolean;
      failureReason?: string;
      cardDetails?: {
        brand?: string;
        last4?: string;
        expiryMonth?: number;
        expiryYear?: number;
      };
    },
    authUser?: AuthUserPayload
  ): Promise<{
    booking: BookingResponse;
    payment: PaymentRecordEntity;
    success: boolean;
    errorMessage?: string;
  }> {
    const { BookingService } = await import('../booking.service');
    const booking = await BookingService.getBookingByIdOrReference(idOrReference);

    if (booking.status === 'cancelled') {
      throw new BadRequestError('Cannot process payment for a cancelled booking');
    }

    // Role & Ownership check for authenticated customers
    if (authUser && (authUser.role || '').toUpperCase() === 'CUSTOMER') {
      if (booking.customerId && booking.customerId !== authUser.id) {
        throw new ForbiddenError('Access denied: You can only process payment for your own reservation');
      }
    }

    const provider = PaymentProviderRegistry.getProvider();

    // Execute payment via the provider abstraction
    const executionResult: PaymentExecutionResult = await provider.confirmPayment({
      bookingId: booking.id,
      paymentIntentId: input.paymentIntentId,
      paymentMethod: input.paymentMethod || 'credit_card',
      simulateFailure: input.simulateFailure,
      failureReason: input.failureReason,
      paymentMethodDetails: input.cardDetails,
    });

    const now = new Date();
    const paymentRecordId = `pay_${crypto.randomUUID()}`;

    const paymentRecord: PaymentRecordEntity = {
      id: paymentRecordId,
      booking_id: booking.id,
      amount: executionResult.amount || booking.totalPrice,
      currency: executionResult.currency || booking.priceCurrency,
      payment_method: input.paymentMethod || 'credit_card',
      transaction_reference: executionResult.transactionReference,
      status: executionResult.success ? 'completed' : 'failed',
      refund_amount: 0,
      gateway_response: executionResult.gatewayResponse,
      paid_at: executionResult.paidAt || null,
      created_at: now,
      updated_at: now,
    };

    // Store in-memory payment record
    const existingRecords = inMemoryPayments.get(booking.id) || [];
    existingRecords.push(paymentRecord);
    inMemoryPayments.set(booking.id, existingRecords);

    // Persist to PostgreSQL if connected
    if (await this.isDbConnected()) {
      try {
        await db.query(
          `INSERT INTO payments (
            id, booking_id, amount, currency, payment_method,
            transaction_reference, status, refund_amount, gateway_response,
            paid_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            paymentRecord.id,
            paymentRecord.booking_id,
            paymentRecord.amount,
            paymentRecord.currency,
            paymentRecord.payment_method,
            paymentRecord.transaction_reference,
            paymentRecord.status,
            paymentRecord.refund_amount,
            JSON.stringify(paymentRecord.gateway_response),
            paymentRecord.paid_at,
            paymentRecord.created_at,
            paymentRecord.updated_at,
          ]
        );
      } catch (err) {
        logger.warn('Failed to insert payment record in DB, stored in memory', { error: err });
      }
    }

    if (executionResult.success) {
      // 1. Payment SUCCESS:
      // - Transition booking status to 'confirmed'
      // - Transition payment status to 'paid'
      await BookingService.updateBookingPaymentState(booking.id, 'paid', 'confirmed');
      SlotEngineService.updateBookingStatus(booking.id, 'confirmed');

      logger.info('Payment confirmed and booking verified', {
        bookingId: booking.id,
        reference: booking.bookingReference,
        txRef: executionResult.transactionReference,
      });

      const updatedBooking = await BookingService.getBookingByIdOrReference(booking.id);
      return {
        booking: updatedBooking,
        payment: paymentRecord,
        success: true,
      };
    } else {
      // 2. Payment FAILED:
      // - Transition booking status to 'payment-failed'
      // - Transition payment status to 'failed'
      // - Releases slot capacity since status is no longer 'pending' or 'confirmed'
      await BookingService.updateBookingPaymentState(booking.id, 'failed', 'payment-failed');
      SlotEngineService.updateBookingStatus(booking.id, 'payment-failed');

      logger.warn('Payment failed and booking marked payment-failed', {
        bookingId: booking.id,
        reference: booking.bookingReference,
        error: executionResult.errorMessage,
      });

      const updatedBooking = await BookingService.getBookingByIdOrReference(booking.id);
      return {
        booking: updatedBooking,
        payment: paymentRecord,
        success: false,
        errorMessage: executionResult.errorMessage,
      };
    }
  }

  /**
   * Retrieve payment history and active intent for a booking
   */
  public static async getPaymentDetailsForBooking(
    bookingId: string,
    authUser?: AuthUserPayload
  ): Promise<{
    payments: PaymentRecordEntity[];
    paymentSummary?: PaymentSummaryResponse;
    activeIntent?: PaymentIntentResponse | null;
  }> {
    let resolvedId = bookingId;
    if (bookingId.startsWith('BK-')) {
      const { BookingService } = await import('../booking.service');
      const b = await BookingService.getBookingByIdOrReference(bookingId);
      resolvedId = b.id;
    }

    if (authUser && (authUser.role || '').toUpperCase() === 'CUSTOMER') {
      const { BookingService } = await import('../booking.service');
      const b = await BookingService.getBookingByIdOrReference(resolvedId);
      if (b.customerId && b.customerId !== authUser.id) {
        throw new ForbiddenError('Access denied: You can only view payment details for your own reservations');
      }
    }

    let payments: PaymentRecordEntity[] = [];

    if (await this.isDbConnected()) {
      try {
        const res = await db.query<PaymentRecordEntity>(
          `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC`,
          [resolvedId]
        );
        payments = res.rows;
      } catch {
        payments = inMemoryPayments.get(resolvedId) || [];
      }
    } else {
      payments = inMemoryPayments.get(resolvedId) || [];
    }

    const latestCompleted = payments.find((p) => p.status === 'completed');
    const latestPayment = payments[0];

    const paymentSummary: PaymentSummaryResponse | undefined = latestCompleted
      ? {
          id: latestCompleted.id,
          transactionReference: latestCompleted.transaction_reference,
          paymentMethod: latestCompleted.payment_method,
          amount: Number(latestCompleted.amount),
          currency: latestCompleted.currency,
          status: 'paid',
          paidAt: latestCompleted.paid_at ? new Date(latestCompleted.paid_at).toISOString() : undefined,
        }
      : latestPayment
      ? {
          id: latestPayment.id,
          transactionReference: latestPayment.transaction_reference,
          paymentMethod: latestPayment.payment_method,
          amount: Number(latestPayment.amount),
          currency: latestPayment.currency,
          status: latestPayment.status === 'failed' ? 'failed' : 'pending',
        }
      : undefined;

    const activeIntent = inMemoryIntents.get(resolvedId) || null;

    return {
      payments,
      paymentSummary,
      activeIntent,
    };
  }

  /**
   * Helper for tests: clear in-memory payment ledger
   */
  public static clearInMemoryPayments(): void {
    inMemoryPayments.clear();
    inMemoryIntents.clear();
  }
}
