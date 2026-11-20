import type { Language } from '@usta/shared';

export interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

/** Messages the map page sends to the app (window.ReactNativeWebView.postMessage). */
export type MapMessage =
  | { type: 'ready' }
  /** The map stopped moving: this point is under the center pin. */
  | { type: 'center'; lat: number; lng: number; address: string | null }
  /** Address search found nothing. */
  | { type: 'notFound' }
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
    if (msg.type === 'ready' || msg.type === 'error' || msg.type === 'notFound') {
      return { type: msg.type };
    }
    if (
      msg.type === 'center' &&
      typeof msg.lat === 'number' &&
      typeof msg.lng === 'number' &&
      Number.isFinite(msg.lat) &&
      Number.isFinite(msg.lng)
    ) {
      const address = typeof msg.address === 'string' ? msg.address.slice(0, 300) : null;
      return { type: 'center', lat: msg.lat, lng: msg.lng, address };
    }
  } catch {
    // Not JSON: ignore.
  }
  return null;
}

/** JavaScript the app injects to move the map (e.g. "my location"). */
export function setCenterScript(lat: number, lng: number): string {
  return `window.app && window.app.setCenter(${Number(lat)}, ${Number(lng)}); true;`;
}

/** JavaScript the app injects to search an address. The text is JSON-escaped. */
export function searchScript(text: string): string {
  return `window.app && window.app.search(${JSON.stringify(text.slice(0, 200))}); true;`;
}

/**
 * A small HTML page with the Yandex Maps JavaScript API in "center pin" mode
 * (design/screens/AddressMap.html): the pin is drawn by the app on top of the map;
 * when the map stops moving, the page reports the center and its street address.
 */
export function buildYandexMapHtml(options: {
  apiKey: string;
  language: Language;
  center: MapCenter;
}): string {
  const config = JSON.stringify({
    center: [options.center.lat, options.center.lng],
    zoom: options.center.zoom,
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
    var map = new ymaps.Map('map', { center: config.center, zoom: config.zoom, controls: [] });
    function reportCenter() {
      var c = map.getCenter();
      // Turn the point under the pin into a street address (reverse geocoding).
      ymaps.geocode(c, { results: 1 }).then(function (res) {
        var first = res.geoObjects.get(0);
        send({ type: 'center', lat: c[0], lng: c[1], address: first ? first.getAddressLine() : null });
      }, function () {
        send({ type: 'center', lat: c[0], lng: c[1], address: null });
      });
    }
    map.events.add('actionend', reportCenter);
    window.app = {
      setCenter: function (lat, lng) { map.setCenter([lat, lng], 17, { duration: 300 }); },
      search: function (text) {
        ymaps.geocode(text, { results: 1, boundedBy: map.getBounds() }).then(function (res) {
          var first = res.geoObjects.get(0);
          if (first) map.setCenter(first.geometry.getCoordinates(), 17, { duration: 300 });
          else send({ type: 'notFound' });
        }, function () { send({ type: 'notFound' }); });
      }
    };
    send({ type: 'ready' });
    reportCenter();
  });
</script>
</body>
</html>`;
}
