import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@usta/shared';

// SecureStore keeps values encrypted by the phone (Android Keystore / iOS Keychain).
const ACCESS_KEY = 'auth.accessToken';
const REFRESH_KEY = 'auth.refreshToken';

// Keep a copy in memory so we don't read encrypted storage on every request.
let cache: AuthTokens | null | undefined;

export const tokenStorage = {
  async get(): Promise<AuthTokens | null> {
    if (cache !== undefined) return cache;
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);
      cache = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    } catch {
      cache = null;
    }
    return cache;
  },

  async save(tokens: AuthTokens): Promise<void> {
    cache = tokens;
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    ]);
  },

  async clear(): Promise<void> {
    cache = null;
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};
