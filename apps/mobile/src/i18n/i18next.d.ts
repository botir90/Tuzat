import 'i18next';
import type { TranslationKeys } from './resources';

// Makes t('...') type-safe: a typo in a translation key becomes a type error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: TranslationKeys };
  }
}
