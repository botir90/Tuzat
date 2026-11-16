import { describe, expect, it } from 'vitest';
import { buildYandexMapHtml, parseMapMessage } from './yandexHtml';

describe('parseMapMessage', () => {
  it('accepts a valid pick', () => {
    expect(
      parseMapMessage(
        '{"type":"pick","lat":41.55,"lng":60.63,"address":"Urganch, Al-Xorazmiy 12"}',
      ),
    ).toEqual({ type: 'pick', lat: 41.55, lng: 60.63, address: 'Urganch, Al-Xorazmiy 12' });
  });

  it('rejects broken or unexpected messages', () => {
    expect(parseMapMessage('not json')).toBeNull();
    expect(parseMapMessage('{"type":"pick","lat":"x","lng":1}')).toBeNull();
    expect(parseMapMessage('{"type":"hack"}')).toBeNull();
  });
});

describe('buildYandexMapHtml', () => {
  it('loads the API with the key and language', () => {
    const html = buildYandexMapHtml({
      apiKey: 'test-key',
      language: 'ru',
      center: { lat: 41.55, lng: 60.63, zoom: 13 },
      pin: null,
    });
    expect(html).toContain('apikey=test-key&lang=ru_RU');
    expect(html).toContain('"center":[41.55,60.63]');
  });
});
