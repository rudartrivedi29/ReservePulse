import {
  CreatePaymentIntentInput,
  PaymentIntentResult,
  ConfirmPaymentInput,
  PaymentExecutionResult,
} from '../payment.types';

export interface IPaymentProvider {
  /** Unique identifier for the provider (e.g., 'mock', 'stripe', 'paypal') */
  readonly name: string;

  /**
   * Create a payment intent with the provider.
   * Generates a safe client secret for customer checkout.
   */
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;

  /**
   * Confirm or capture a payment using the payment intent.
   * Never accepts or stores raw sensitive card data.
   */
  confirmPayment(input: ConfirmPaymentInput): Promise<PaymentExecutionResult>;

  /**
   * Retrieve current intent status from provider
   */
  getPaymentIntent(intentId: string): Promise<PaymentIntentResult | null>;

  /**
   * Cancel an open payment intent
   */
  cancelPaymentIntent?(intentId: string): Promise<void>;
}
