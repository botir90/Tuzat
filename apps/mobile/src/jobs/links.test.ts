import { describe, expect, it, vi } from 'vitest';
import type { RequestDto } from '@usta/shared';

// links.ts imports Linking from react-native; tests only need the URL builders.
vi.mock('react-native', () => ({ Linking: { openURL: vi.fn() } }));
const { googleMapsUrl, yandexMapsUrl } = await import('./links');

const base = { address: 'Al-Xorazmiy 12', lat: null, lng: null } as unknown as RequestDto;

describe('map links', () => {
  it('uses coordinates when present', () => {
    const withGps = { ...base, lat: 41.55, lng: 60.63 };
    expect(yandexMapsUrl(withGps, 'Xorazm', 'Urganch')).toBe(
      'https://yandex.uz/maps/?pt=60.63,41.55&z=17&l=map',
    );
    expect(googleMapsUrl(withGps, 'Xorazm', 'Urganch')).toContain('query=41.55%2C60.63');
  });

  it('searches by address text otherwise', () => {
    expect(yandexMapsUrl(base, 'Xorazm', 'Urganch')).toBe(
      `https://yandex.uz/maps/?text=${encodeURIComponent('Al-Xorazmiy 12, Urganch, Xorazm')}`,
    );
  });
});
