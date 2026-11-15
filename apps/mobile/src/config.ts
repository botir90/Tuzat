import Constants from 'expo-constants';

const API_PORT = 3000;

/**
 * Where the API lives.
 * 1. EXPO_PUBLIC_API_URL from apps/mobile/.env wins (used for real builds).
 * 2. In development we reuse the laptop IP that Expo Go already connected to,
 *    so it keeps working when the hotspot IP changes.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // e.g. "10.163.204.216:8081"
  const host = hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

/** Give up on a request after this many milliseconds (slow 3G still fits). */
export const REQUEST_TIMEOUT_MS = 20_000;
