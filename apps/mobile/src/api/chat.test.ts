import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: vi.fn() },
}));
vi.mock('./client', () => ({ api: vi.fn() }));
const { mergeMessages } = await import('./chat');

const msg = (id: string) => ({
  id,
  type: 'TEXT' as const,
  text: id,
  mediaUrl: null,
  durationMs: null,
  event: null,
  params: null,
  mine: false,
  createdAt: '2026-11-23T10:00:00Z',
});

describe('mergeMessages', () => {
  it('appends new messages and skips ones already shown', () => {
    expect(mergeMessages([msg('a'), msg('b')], [msg('b'), msg('c')]).map((m) => m.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});
