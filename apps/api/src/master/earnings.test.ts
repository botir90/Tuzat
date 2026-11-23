import { describe, expect, it } from 'vitest';
import { dayIndex, monthStart, sumByDay, weekStart } from './earnings';

describe('earnings dates (Tashkent time)', () => {
  // Monday 23 Nov 2026, 22:00 UTC = Tuesday 24 Nov 03:00 in Tashkent.
  const lateMondayUtc = new Date('2026-11-23T22:00:00Z');

  it('the week starts on Monday 00:00 Tashkent time', () => {
    expect(weekStart(lateMondayUtc).toISOString()).toBe('2026-11-22T19:00:00.000Z');
    expect(dayIndex(lateMondayUtc)).toBe(1);
  });

  it('the month starts on the 1st 00:00 Tashkent time', () => {
    expect(monthStart(lateMondayUtc).toISOString()).toBe('2026-10-31T19:00:00.000Z');
  });

  it('sums jobs per weekday and ignores older ones', () => {
    const start = weekStart(lateMondayUtc);
    const days = sumByDay(
      [
        { doneAt: new Date('2026-11-24T05:00:00Z'), price: 100_000 }, // Tuesday 10:00
        { doneAt: new Date('2026-11-24T10:00:00Z'), price: 50_000 }, // Tuesday 15:00
        { doneAt: new Date('2026-11-20T10:00:00Z'), price: 999 }, // last week
      ],
      start,
    );
    expect(days).toEqual([0, 150_000, 0, 0, 0, 0, 0]);
  });
});
