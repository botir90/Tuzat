import { describe, expect, it } from 'vitest';
import { relativeTime } from './relativeTime';

const now = new Date('2026-11-21T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe('relativeTime', () => {
  it.each([
    [10_000, { key: 'time.justNow', count: 0 }],
    [2 * 60_000, { key: 'time.minutesAgo', count: 2 }],
    [3 * 3_600_000, { key: 'time.hoursAgo', count: 3 }],
    [2 * 86_400_000, { key: 'time.daysAgo', count: 2 }],
  ])('%d ms ago', (ms, expected) => {
    expect(relativeTime(ago(ms), now)).toEqual(expected);
  });

  it('never returns a negative time', () => {
    expect(relativeTime(ago(-5_000), now)).toEqual({ key: 'time.justNow', count: 0 });
  });
});
