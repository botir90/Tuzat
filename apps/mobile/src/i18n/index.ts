import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, LANGUAGES, isLanguage, type Language } from '@usta/shared';
import { detectLanguage } from './detect';
import { resources } from './resources';

const STORAGE_KEY = 'app.language';

let languageChosen = false;

/** True when the user has already picked a language (on this or an earlier launch). */
export function hasChosenLanguage(): boolean {
  return languageChosen;
}

async function readSavedLanguage(): Promise<Language | null> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return isLanguage(saved) ? saved : null;
  } catch {
    // Storage can fail on some devices; then we simply ask for the language again.
    return null;
  }
}

/** Call once at app start, before showing any screen. */
export async function initI18n(): Promise<void> {
  const saved = await readSavedLanguage();
  languageChosen = saved !== null;

  await i18n.use(initReactI18next).init({
    resources,
    lng: saved ?? detectLanguage(getLocales()),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES,
    load: 'currentOnly', // don't try to load "uz" for "uz-Latn"
    interpolation: { escapeValue: false }, // React already escapes text
  });
}

/** Switches the language immediately and remembers it for next launches. */
export async function changeLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  languageChosen = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not fatal: the language works now, it just won't be remembered.
  }
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
}
