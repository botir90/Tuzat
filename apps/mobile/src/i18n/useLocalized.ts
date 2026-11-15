import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, isLanguage, type LocalizedText } from '@usta/shared';

/**
 * Returns a function that picks the right language from a { 'uz-Latn', 'uz-Cyrl', ru } object
 * (names of regions, categories, prices come from the server in all three languages).
 */
export function useLocalized() {
  const { i18n } = useTranslation();
  const language = isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
  return (text: LocalizedText): string => text[language];
}
