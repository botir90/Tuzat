import type { Language } from '@usta/shared';

export interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

/** Messages the map page sends to the app (window.ReactNativeWebView.postMessage). */
export type MapMessage =
  | { type: 'ready' }
  | { type: 'pick'; lat: number; lng: number; address: string | null }
  | { type: 'error' };

/** Yandex map language. Yandex has only Latin Uzbek, so both Uzbek scripts use it. */
const YANDEX_LANG: Record<Language, string> = {
  'uz-Latn': 'uz_UZ',
  'uz-Cyrl': 'uz_UZ',
  ru: 'ru_RU',
};

/** Safely parses a message from the map page. Returns null for anything unexpected. */
export function parseMapMessage(raw: string): MapMessage | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || !('type' in data)) return null;
    const msg = data as Record<string, unknown>;
    if (msg.type === 'ready' || msg.type === 'error') return { type: msg.type };
    if (
      msg.type === 'pick' &&
      typeof msg.lat === 'number' &&
      typeof msg.lng === 'number' &&
      Number.isFinite(msg.lat) &&
      Number.isFinite(msg.lng)
    ) {
      const address = typeof msg.address === 'string' ? msg.address.slice(0, 300) : null;
      return { type: 'pick', lat: msg.lat, lng: msg.lng, address };
    }
  } catch {
    // Not JSON: ignore.
  }
  return null;
}

/**
 * A small HTML page with the Yandex Maps JavaScript API.
 * Tap the map or drag the pin → the page sends { type: 'pick', lat, lng, address }.
 */
export function buildYandexMapHtml(options: {
  apiKey: string;
  language: Language;
  center: MapCenter;
  /** Already chosen point, shown as the pin. */
  pin: { lat: number; lng: number } | null;
}): string {
  const config = JSON.stringify({
    center: [options.center.lat, options.center.lng],
    zoom: options.center.zoom,
    pin: options.pin ? [options.pin.lat, options.pin.lng] : null,
  });
  const src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(options.apiKey)}&lang=${YANDEX_LANG[options.language]}`;

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
<script src="${src}"></script>
</head>
<body>
<div id="map"></div>
<script>
  var config = ${config};
  function send(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  // If the Yandex script did not load (no internet), tell the app.
  setTimeout(function () { if (typeof ymaps === 'undefined') send({ type: 'error' }); }, 15000);
  if (typeof ymaps !== 'undefined') ymaps.ready(function () {
    var map = new ymaps.Map('map', { center: config.pin || config.center, zoom: config.pin ? 17 : config.zoom,
      controls: ['zoomControl', 'geolocationControl'] });
    var pin = null;
    function pick(coords) {
      if (!pin) {
        pin = new ymaps.Placemark(coords, {}, { draggable: true, preset: 'islands#redDotIcon' });
        pin.events.add('dragend', function () { pick(pin.geometry.getCoordinates()); });
        map.geoObjects.add(pin);
      } else {
        pin.geometry.setCoordinates(coords);
      }
      // Turn the point into a street address (reverse geocoding).
      ymaps.geocode(coords, { results: 1 }).then(function (res) {
        var first = res.geoObjects.get(0);
        send({ type: 'pick', lat: coords[0], lng: coords[1], address: first ? first.getAddressLine() : null });
      }, function () {
        send({ type: 'pick', lat: coords[0], lng: coords[1], address: null });
      });
    }
    map.events.add('click', function (e) { pick(e.get('coords')); });
    if (config.pin) pick(config.pin);
    send({ type: 'ready' });
  });
</script>
</body>
</html>`;
}
