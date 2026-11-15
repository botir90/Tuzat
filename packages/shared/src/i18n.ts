/** Languages supported from day one. */
export const LANGUAGES = ['uz-Latn', 'uz-Cyrl', 'ru'] as const;

/** A union type built from the array above: 'uz-Latn' | 'uz-Cyrl' | 'ru'. */
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'uz-Latn';

/** Text stored in all three languages (category names, price items, regions...). */
export type LocalizedText = Record<Language, string>;

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
