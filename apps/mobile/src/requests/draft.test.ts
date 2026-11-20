import { describe, expect, it, vi } from 'vitest';

// draft.ts creates a Zustand store; only the pure helper is tested here.
vi.mock('zustand', () => ({ create: () => () => undefined }));
const { composeAddress } = await import('./draft');

const labels = { apartment: (v: string) => `kv. ${v}`, floor: (v: string) => `${v}-qavat` };

describe('composeAddress', () => {
  it('joins street, apartment and floor', () => {
    expect(
      composeAddress({ address: ' Al-Xorazmiy 24 ', apartment: '5', floor: '3' }, labels),
    ).toBe('Al-Xorazmiy 24, kv. 5, 3-qavat');
  });

  it('skips empty parts', () => {
    expect(composeAddress({ address: 'Al-Xorazmiy 24', apartment: ' ', floor: '' }, labels)).toBe(
      'Al-Xorazmiy 24',
    );
  });
});
