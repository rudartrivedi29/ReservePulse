import crypto from 'crypto';
import { IPaymentProvider } from './payment-provider.interface';
import {
  CreatePaymentIntentInput,
  PaymentIntentResult,
  ConfirmPaymentInput,
  PaymentExecutionResult,
} from '../payment.types';
import { logger } from '../../../utils/logger';

interface MockIntentStorage {
  paymentIntentId: string;
  clientSecret: string;
  bookingId: string;
  bookingReference: string;
  amount: number;
  currency: string;
  status: PaymentIntentResult['status'];
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export class MockPaymentProvider implements IPaymentProvider {
  public readonly name = 'mock';

  private intents: Map<string, MockIntentStorage> = new Map();

  /**
   * Create a mock payment intent.
   * Produces a secure tokenized client secret that mimics Stripe/Braintree client tokens.
   */
  public async createPaymentIntent(
    input: CreatePaymentIntentInput
  ): Promise<PaymentIntentResult> {
    const paymentIntentId = `pi_mock_${crypto.randomUUID().replace(/-/g, '')}`;
    const clientSecret = `pi_sec_${crypto.randomBytes(24).toString('hex')}`;

    const intentData: MockIntentStorage = {
      paymentIntentId,
      clientSecret,
      bookingId: input.bookingId,
      bookingReference: input.bookingReference,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      status: 'requires_payment_method',
      createdAt: new Date(),
      metadata: input.metadata,
    };

    this.intents.set(paymentIntentId, intentData);

    logger.info('Mock payment intent created', {
      provider: this.name,
      paymentIntentId,
      bookingId: input.bookingId,
      amount: input.amount,
      currency: input.currency,
    });

    return {
      paymentIntentId,
      clientSecret,
      provider: this.name,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      status: 'requires_payment_method',
      metadata: input.metadata,
    };
  }

  /**
   * Confirm or capture a mock payment intent.
   * Simulates realistic authorization and capture.
   * Declines if simulateFailure is true or if last4 is '0002' (Stripe decline test convention).
   */
  public async confirmPayment(
    input: ConfirmPaymentInput
  ): Promise<PaymentExecutionResult> {
    const intent = this.intents.get(input.paymentIntentId);
    const amount = intent ? intent.amount : 0;
    const currency = intent ? intent.currency : 'USD';

    // Check for simulated failure trigger (e.g. card ending in 0002 or explicit flag)
    const isDeclined =
      input.simulateFailure === true ||
      input.paymentMethodDetails?.last4 === '0002';

    if (isDeclined) {
      const errorMsg =
        input.failureReason ||
        (input.paymentMethodDetails?.last4 === '0002'
          ? 'Card was declined by the issuing financial institution (insufficient funds).'
          : 'Payment authorization failed: Transaction could not be completed.');

      if (intent) {
        intent.status = 'failed';
        this.intents.set(input.paymentIntentId, intent);
      }

      logger.warn('Mock payment declined / failed', {
        provider: this.name,
        paymentIntentId: input.paymentIntentId,
        bookingId: input.bookingId,
        reason: errorMsg,
      });

      return {
        success: false,
        transactionReference: `tx_failed_${crypto.randomBytes(6).toString('hex')}`,
        paymentIntentId: input.paymentIntentId,
        provider: this.name,
        amount,
        currency,
        status: 'failed',
        errorMessage: errorMsg,
        gatewayResponse: {
          code: 'card_declined',
          decline_code: 'generic_decline',
          provider: this.name,
          paymentMethodDetails: {
            brand: input.paymentMethodDetails?.brand || 'Visa',
            last4: input.paymentMethodDetails?.last4 || '0002',
          },
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Payment succeeded
    const txRef = `tx_mock_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const paidAt = new Date();

    if (intent) {
      intent.status = 'succeeded';
      this.intents.set(input.paymentIntentId, intent);
    }

    logger.info('Mock payment captured successfully', {
      provider: this.name,
      paymentIntentId: input.paymentIntentId,
      bookingId: input.bookingId,
      transactionReference: txRef,
      amount,
      currency,
    });

    return {
      success: true,
      transactionReference: txRef,
      paymentIntentId: input.paymentIntentId,
      provider: this.name,
      amount,
      currency,
      status: 'completed',
      paidAt,
      gatewayResponse: {
        code: 'payment_success',
        provider: this.name,
        paymentMethod: input.paymentMethod || 'credit_card',
        card: {
          brand: input.paymentMethodDetails?.brand || 'Visa',
          last4: input.paymentMethodDetails?.last4 || '4242',
          expiryMonth: input.paymentMethodDetails?.expiryMonth || 12,
          expiryYear: input.paymentMethodDetails?.expiryYear || 2028,
        },
        timestamp: paidAt.toISOString(),
      },
    };
  }

  public async getPaymentIntent(
    intentId: string
  ): Promise<PaymentIntentResult | null> {
    const intent = this.intents.get(intentId);
    if (!intent) return null;

    return {
      paymentIntentId: intent.paymentIntentId,
      clientSecret: intent.clientSecret,
      provider: this.name,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      metadata: intent.metadata,
    };
  }

  public async cancelPaymentIntent(intentId: string): Promise<void> {
    const intent = this.intents.get(intentId);
    if (intent) {
      intent.status = 'failed';
      this.intents.set(intentId, intent);
    }
  }

  /**
   * Helper for tests: clear mock intents
   */
  public clearIntents(): void {
    this.intents.clear();
  }
}
