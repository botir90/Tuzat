import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  SELECTABLE_ROLES,
  type AuthResponse,
  type SelectableRole,
  type UserDto,
} from '@usta/shared';
import { api, setSessionExpiredHandler } from '@/api/client';
import { registerForPush, unregisterPush } from '@/push/register';
import { tokenStorage } from './token-storage';

const MODE_KEY = 'app.mode';
const USER_KEY = 'auth.user';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  user: UserDto | null;
  /** "I need a master" (CUSTOMER) or "I am a master" (MASTER), chosen on the welcome screen. */
  mode: SelectableRole | null;
  init: () => Promise<void>;
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  setMode: (mode: SelectableRole) => Promise<void>;
  setUser: (user: UserDto) => void;
}

function isSelectableRole(value: unknown): value is SelectableRole {
  return typeof value === 'string' && (SELECTABLE_ROLES as readonly string[]).includes(value);
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function safeSet(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  } catch {
    // Not fatal: the app works, it just won't remember this after restart.
  }
}

/**
 * Zustand store: a small global state that any screen can read with useAuth(s => s.user).
 */
export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  mode: null,

  async init() {
    const [savedMode, cachedUser, tokens] = await Promise.all([
      AsyncStorage.getItem(MODE_KEY).catch(() => null),
      readJson<UserDto>(USER_KEY),
      tokenStorage.get(),
    ]);
    const mode = isSelectableRole(savedMode) ? savedMode : null;

    if (!tokens) {
      set({ status: 'signedOut', user: null, mode });
      return;
    }
    // Show the app immediately with the cached user; refresh it in the background.
    set({ status: 'signedIn', user: cachedUser, mode });
    void registerForPush();
    api<UserDto>('/me')
      .then((user) => get().setUser(user))
      .catch(() => undefined); // offline: keep the cached user; expired: handler logs out
  },

  async signIn(response) {
    await tokenStorage.save(response);
    const role = response.user.role;
    const mode = role === 'CUSTOMER' || role === 'MASTER' ? role : get().mode;
    await safeSet(MODE_KEY, mode);
    await safeSet(USER_KEY, JSON.stringify(response.user));
    set({ status: 'signedIn', user: response.user, mode });
    void registerForPush();
  },

  async signOut() {
    const tokens = await tokenStorage.get();
    await unregisterPush();
    if (tokens) {
      // Tell the server, but log out locally even if we're offline.
      await api('/auth/logout', {
        method: 'POST',
        auth: false,
        body: { refreshToken: tokens.refreshToken },
      }).catch(() => undefined);
    }
    await tokenStorage.clear();
    await safeSet(USER_KEY, null);
    set({ status: 'signedOut', user: null });
  },

  async setMode(mode) {
    if (get().status === 'signedIn') {
      const response = await api<AuthResponse>('/me/role', { method: 'PUT', body: { role: mode } });
      await get().signIn(response);
      return;
    }
    await safeSet(MODE_KEY, mode);
    set({ mode });
  },

  setUser(user) {
    void safeSet(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));

// When the refresh token is rejected, the user is logged out everywhere in the app.
setSessionExpiredHandler(() => {
  void safeSet(USER_KEY, null);
  useAuth.setState({ status: 'signedOut', user: null });
});
