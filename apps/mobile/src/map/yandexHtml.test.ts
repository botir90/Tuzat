import { describe, expect, it } from 'vitest';
import { buildYandexMapHtml, parseMapMessage, searchScript, setCenterScript } from './yandexHtml';

describe('parseMapMessage', () => {
  it('accepts the map center with its address', () => {
    expect(
      parseMapMessage(
        '{"type":"center","lat":41.55,"lng":60.63,"address":"Urganch, Al-Xorazmiy 12"}',
      ),
    ).toEqual({ type: 'center', lat: 41.55, lng: 60.63, address: 'Urganch, Al-Xorazmiy 12' });
  });

  it('accepts simple events', () => {
    expect(parseMapMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseMapMessage('{"type":"notFound"}')).toEqual({ type: 'notFound' });
  });

  it('rejects broken or unexpected messages', () => {
    expect(parseMapMessage('not json')).toBeNull();
    expect(parseMapMessage('{"type":"center","lat":"x","lng":1}')).toBeNull();
    expect(parseMapMessage('{"type":"hack"}')).toBeNull();
  });
});

describe('scripts injected into the map', () => {
  it('escapes search text so it cannot break out of the string', () => {
    const script = searchScript('Al-Xorazmiy "12"); alert(1); ("');
    expect(script).toContain('window.app.search("Al-Xorazmiy \\"12\\"); alert(1); (\\"")');
  });

  it('only passes numbers to setCenter', () => {
    expect(setCenterScript(41.5, 60.6)).toContain('setCenter(41.5, 60.6)');
  });
});

describe('buildYandexMapHtml', () => {
  it('loads the API with the key and language', () => {
    const html = buildYandexMapHtml({
      apiKey: 'test-key',
      language: 'ru',
      center: { lat: 41.55, lng: 60.63, zoom: 13 },
    });
    expect(html).toContain('apikey=test-key&lang=ru_RU');
    expect(html).toContain('"center":[41.55,60.63]');
  });
});
