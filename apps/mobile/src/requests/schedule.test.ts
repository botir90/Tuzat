import { describe, expect, it } from 'vitest';
import { formatDateTime, slotToIso } from './schedule';

describe('schedule helpers', () => {
  it('builds a slot N days ahead at the given hour', () => {
    const now = new Date(2026, 0, 31, 20, 30); // 31 Jan, local time
    const iso = slotToIso(1, 9, now);
    const d = new Date(iso);
    expect([d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([1, 1, 9, 0]);
  });

  it('formats local date and time', () => {
    expect(formatDateTime(new Date(2026, 10, 5, 7, 3).toISOString())).toBe('05.11 07:03');
  });
});
