import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'app.location';

interface LocationState {
  regionId: string | null;
  districtId: string | null;
  load: () => Promise<void>;
  setLocation: (regionId: string, districtId: string) => Promise<void>;
}

/** The customer's chosen region and district, remembered between launches. */
export const useLocation = create<LocationState>((set) => ({
  regionId: null,
  districtId: null,

  async load() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { regionId?: unknown; districtId?: unknown };
      if (typeof parsed.regionId === 'string' && typeof parsed.districtId === 'string') {
        set({ regionId: parsed.regionId, districtId: parsed.districtId });
      }
    } catch {
      // Ignore broken data; the user simply picks the location again.
    }
  },

  async setLocation(regionId, districtId) {
    set({ regionId, districtId });
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify({ regionId, districtId }));
    } catch {
      // Not fatal.
    }
  },
}));
