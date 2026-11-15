import { DEFAULT_LANGUAGE, type Language } from '@usta/shared';

export interface DeviceLocale {
  languageCode: string | null;
  languageScriptCode?: string | null;
}

/** Picks the best app language from the phone's language settings. */
export function detectLanguage(locales: readonly DeviceLocale[]): Language {
  for (const locale of locales) {
    if (locale.languageCode === 'ru') return 'ru';
    if (locale.languageCode === 'uz') {
      return locale.languageScriptCode === 'Cyrl' ? 'uz-Cyrl' : 'uz-Latn';
    }
  }
  return DEFAULT_LANGUAGE;
}
