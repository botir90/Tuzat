import { describe, expect, it } from 'vitest';
import { bonusAllowed, levelFor, promoDiscount } from './growth';

describe('levelFor', () => {
  it('starts at bronze and counts orders to the next level', () => {
    expect(levelFor(0)).toMatchObject({ level: 'BRONZE', cashbackPercent: 3, ordersToNext: 5 });
    expect(levelFor(13)).toMatchObject({ level: 'SILVER', nextLevel: 'GOLD', ordersToNext: 2 });
    expect(levelFor(40)).toMatchObject({ level: 'GOLD', nextLevel: null, ordersToNext: null });
  });
});

describe('promoDiscount', () => {
  it('applies a percent with a cap', () => {
    expect(promoDiscount({ percent: 20, amount: null, maxDiscount: 50_000 }, 120_000)).toBe(24_000);
    expect(promoDiscount({ percent: 20, amount: null, maxDiscount: 50_000 }, 500_000)).toBe(50_000);
  });
  it('never discounts more than the order', () => {
    expect(promoDiscount({ percent: null, amount: 30_000, maxDiscount: null }, 20_000)).toBe(
      20_000,
    );
  });
});

describe('bonusAllowed', () => {
  it('pays at most half of the order and never more than the balance', () => {
    expect(bonusAllowed(120_000, 100_000)).toBe(60_000);
    expect(bonusAllowed(120_000, 34_800)).toBe(34_800);
    expect(bonusAllowed(120_000, 0)).toBe(0);
  });
});
