import { describe, expect, it, vi } from 'vitest';

vi.mock('@/requests/schedule', () => ({ formatDateTime: () => 'DATE' }));
const { arrivalText } = await import('./arrival');

const t = ((key: string, options?: Record<string, unknown>) =>
  `${key}${options ? JSON.stringify(options) : ''}`) as never;
const now = new Date('2026-11-23T10:00:00Z');
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

describe('arrivalText', () => {
  it('says "now" for the past', () => {
    expect(arrivalText(t, at(-5), now)).toBe('offers.arriveNow');
  });
  it('uses minutes under an hour', () => {
    expect(arrivalText(t, at(25), now)).toBe('offers.inMinutes{"count":25}');
  });
  it('uses whole hours', () => {
    expect(arrivalText(t, at(120), now)).toBe('offers.inHours{"count":2}');
  });
  it('uses hours and minutes', () => {
    expect(arrivalText(t, at(90), now)).toBe('offers.inHoursMinutes{"hours":1,"minutes":30}');
  });
  it('uses the date for later', () => {
    expect(arrivalText(t, at(24 * 60), now)).toBe('DATE');
  });
});
