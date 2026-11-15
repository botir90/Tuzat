import { Linking } from 'react-native';
import type { RequestDto } from '@usta/shared';

/** Opens the phone app with the number ready to call. */
export function callPhone(phone: string): Promise<void> {
  return Linking.openURL(`tel:${phone}`);
}

/** Text for searching the address on a map when there are no GPS coordinates. */
function addressQuery(request: RequestDto, regionName: string, districtName: string): string {
  return [request.address, districtName, regionName].filter(Boolean).join(', ');
}

/** Yandex Maps (good coverage in Uzbekistan). Opens the app if installed, else the browser. */
export function yandexMapsUrl(request: RequestDto, regionName: string, districtName: string) {
  if (request.lat !== null && request.lng !== null) {
    return `https://yandex.uz/maps/?pt=${request.lng},${request.lat}&z=17&l=map`;
  }
  return `https://yandex.uz/maps/?text=${encodeURIComponent(addressQuery(request, regionName, districtName))}`;
}

export function googleMapsUrl(request: RequestDto, regionName: string, districtName: string) {
  const query =
    request.lat !== null && request.lng !== null
      ? `${request.lat},${request.lng}`
      : addressQuery(request, regionName, districtName);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
