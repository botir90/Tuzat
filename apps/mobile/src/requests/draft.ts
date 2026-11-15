import { create } from 'zustand';
import type { DesiredTime } from '@usta/shared';

export interface DraftPhoto {
  /** Local, already compressed file. */
  uri: string;
}

export interface DraftVoice {
  uri: string;
  durationMs: number;
}

interface DraftState {
  categoryId: string | null;
  description: string;
  photos: DraftPhoto[];
  voice: DraftVoice | null;
  address: string;
  landmark: string;
  coords: { lat: number; lng: number } | null;
  desiredTime: DesiredTime;
  scheduledAt: string | null;
  start: (categoryId: string) => void;
  update: (patch: Partial<Omit<DraftState, 'start' | 'update' | 'reset'>>) => void;
  reset: () => void;
}

const empty = {
  categoryId: null,
  description: '',
  photos: [],
  voice: null,
  landmark: '',
  coords: null,
  desiredTime: 'TODAY' as DesiredTime,
  scheduledAt: null,
};

/**
 * The request being written. Kept in memory, so the form survives
 * a trip to the login screens in the middle of creating it.
 */
export const useDraft = create<DraftState>((set, get) => ({
  ...empty,
  // The address is kept between requests (people order to the same home).
  address: '',
  start(categoryId) {
    if (get().categoryId !== categoryId) set({ ...empty, categoryId });
  },
  update(patch) {
    set(patch);
  },
  reset() {
    set({ ...empty });
  },
}));
