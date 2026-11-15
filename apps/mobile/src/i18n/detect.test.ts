import { describe, expect, it } from 'vitest';
import { detectLanguage } from './detect';

describe('detectLanguage', () => {
  it('picks Russian for a Russian phone', () => {
    expect(detectLanguage([{ languageCode: 'ru' }])).toBe('ru');
  });

  it('picks Cyrillic Uzbek when the script is Cyrl', () => {
    expect(detectLanguage([{ languageCode: 'uz', languageScriptCode: 'Cyrl' }])).toBe('uz-Cyrl');
  });

  it('picks Latin Uzbek for a plain Uzbek phone', () => {
    expect(detectLanguage([{ languageCode: 'uz' }])).toBe('uz-Latn');
  });

  it('falls back to Latin Uzbek for other languages', () => {
    expect(detectLanguage([{ languageCode: 'en' }])).toBe('uz-Latn');
  });
});
