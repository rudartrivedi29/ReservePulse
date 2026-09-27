import { IPaymentProvider } from './providers/payment-provider.interface';
import { MockPaymentProvider } from './providers/mock.provider';
import { logger } from '../../utils/logger';

export class PaymentProviderRegistry {
  private static providers: Map<string, IPaymentProvider> = new Map();
  private static defaultProviderName: string = 'mock';

  static {
    // Register standard mock provider by default
    const mockProvider = new MockPaymentProvider();
    this.registerProvider(mockProvider);
  }

  /**
   * Register a new payment provider (e.g. StripePaymentProvider, PayPalProvider, etc.)
   */
  public static registerProvider(provider: IPaymentProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
    logger.info(`Payment provider "${provider.name}" registered in registry`);
  }

  /**
   * Set active default provider
   */
  public static setDefaultProvider(name: string): void {
    const key = name.toLowerCase();
    if (!this.providers.has(key)) {
      throw new Error(`Cannot set default payment provider: "${name}" is not registered`);
    }
    this.defaultProviderName = key;
    logger.info(`Active default payment provider switched to "${key}"`);
  }

  /**
   * Retrieve a payment provider by name or default
   */
  public static getProvider(name?: string): IPaymentProvider {
    const key = (name || this.defaultProviderName).toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      logger.warn(`Provider "${key}" not found, falling back to mock provider`);
      return this.providers.get('mock')!;
    }
    return provider;
  }

  /**
   * List all registered provider names
   */
  public static getRegisteredProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}
