/**
 * A licensed payment provider (Click / Payme marketplace, split payments).
 * The provider holds the customer's money; we only tell it what to do.
 * Real implementations come after the MChJ and the marketplace contract exist.
 */
export interface PaymentProvider {
  readonly name: string;
  /**
   * Asks the customer to pay `amount` into a hold. Returns the provider's id and,
   * for real providers, a page where the customer pays. `paid` = already held.
   */
  createHold(input: { paymentId: string; amount: number; method: 'CLICK' | 'PAYME' }): Promise<{
    providerRef: string;
    payUrl: string | null;
    paid: boolean;
  }>;
  /** Moves held money to the master's card (minus commission, which stays with us). */
  payout(input: {
    masterId: string;
    jobId: string;
    amount: number;
  }): Promise<{ providerRef: string }>;
  /** Returns held money to the customer. */
  refund(input: { providerRef: string; amount: number }): Promise<void>;
}

/**
 * Development and tests: every call succeeds at once. Never moves real money.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';
  holds: { paymentId: string; amount: number }[] = [];
  payouts: { masterId: string; jobId: string; amount: number }[] = [];
  refunds: { providerRef: string; amount: number }[] = [];
  private counter = 0;

  async createHold(input: { paymentId: string; amount: number }) {
    this.holds.push(input);
    this.counter += 1;
    return { providerRef: `fake-${input.paymentId}-${this.counter}`, payUrl: null, paid: true };
  }

  async payout(input: { masterId: string; jobId: string; amount: number }) {
    this.payouts.push(input);
    this.counter += 1;
    return { providerRef: `fake-payout-${this.counter}` };
  }

  async refund(input: { providerRef: string; amount: number }) {
    this.refunds.push(input);
  }
}
