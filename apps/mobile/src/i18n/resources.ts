import type { Language } from '@usta/shared';
import ru from './locales/ru.json';
import uzCyrl from './locales/uz-Cyrl.json';
import uzLatn from './locales/uz-Latn.json';

// uz-Latn is the "reference" file: the other two must have exactly the same keys
// (checked by resources.test.ts).
export type TranslationKeys = typeof uzLatn;

export const resources: Record<Language, { translation: TranslationKeys }> = {
  'uz-Latn': { translation: uzLatn },
  'uz-Cyrl': { translation: uzCyrl },
  ru: { translation: ru },
};

/** Each language's name written in that language, for the language picker. */
export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  'uz-Latn': "O'zbekcha",
  'uz-Cyrl': 'Ўзбекча',
  ru: 'Русский',
};
