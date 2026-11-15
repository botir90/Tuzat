import { describe, expect, it } from 'vitest';
import { isLanguage } from './i18n';

describe('isLanguage', () => {
  it('accepts supported languages', () => {
    expect(isLanguage('uz-Latn')).toBe(true);
    expect(isLanguage('ru')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isLanguage('en')).toBe(false);
    expect(isLanguage(42)).toBe(false);
  });
});
