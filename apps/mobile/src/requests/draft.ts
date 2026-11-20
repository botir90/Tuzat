import { create } from 'zustand';
import type { DesiredTime } from '@usta/shared';

export interface DraftPhoto {
  /** Local compressed file, or a download URL for an already uploaded photo. */
  uri: string;
  /** Set when the photo is already uploaded (e.g. when editing a profile). */
  key?: string;
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
  apartment: string;
  floor: string;
  coords: { lat: number; lng: number } | null;
  desiredTime: DesiredTime;
  scheduledAt: string | null;
  start: (categoryId: string) => void;
  update: (patch: Partial<Omit<DraftState, 'start' | 'update' | 'reset'>>) => void;
  reset: () => void;
}

/** Reset for every new request. The address part is kept (people order to the same home). */
const empty = {
  categoryId: null,
  description: '',
  photos: [],
  voice: null,
  desiredTime: 'TODAY' as DesiredTime,
  scheduledAt: null,
};

/**
 * The request being written. Kept in memory, so the form survives
 * a trip to the login screens in the middle of creating it.
 */
export const useDraft = create<DraftState>((set, get) => ({
  ...empty,
  address: '',
  landmark: '',
  apartment: '',
  floor: '',
  coords: null,
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

/**
 * The address line sent to the API: street from the map (or typed) + apartment + floor,
 * e.g. "Al-Xorazmiy ko'chasi, 24, kv. 5, 3-qavat". Labels come from i18n.
 */
export function composeAddress(
  draft: { address: string; apartment: string; floor: string },
  labels: { apartment: (value: string) => string; floor: (value: string) => string },
): string {
  return [
    draft.address.trim(),
    draft.apartment.trim() ? labels.apartment(draft.apartment.trim()) : null,
    draft.floor.trim() ? labels.floor(draft.floor.trim()) : null,
  ]
    .filter(Boolean)
    .join(', ');
}
