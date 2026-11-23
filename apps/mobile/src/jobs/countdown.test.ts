import { describe, expect, it } from 'vitest';
import { hoursLeft } from './countdown';

describe('hoursLeft', () => {
  const now = new Date('2026-11-23T10:00:00Z');
  it('rounds up and never goes below zero', () => {
    expect(hoursLeft('2026-11-24T08:30:00Z', now)).toBe(23);
    expect(hoursLeft('2026-11-23T09:00:00Z', now)).toBe(0);
    expect(hoursLeft(null, now)).toBeNull();
  });
});
