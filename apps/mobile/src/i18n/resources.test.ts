import { describe, expect, it } from 'vitest';
import ru from './locales/ru.json';
import uzCyrl from './locales/uz-Cyrl.json';
import uzLatn from './locales/uz-Latn.json';

/** Flattens {"a": {"b": "x"}} into ["a.b"]. */
function keysOf(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? keysOf(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

/** Collects every translated string. */
function valuesOf(value: object): unknown[] {
  return Object.values(value).flatMap((child) =>
    typeof child === 'object' && child !== null ? valuesOf(child) : [child],
  );
}

describe('translation files', () => {
  const reference = keysOf(uzLatn).sort();

  it.each([
    ['uz-Cyrl', uzCyrl],
    ['ru', ru],
  ])('%s has exactly the same keys as uz-Latn', (_name, file) => {
    expect(keysOf(file).sort()).toEqual(reference);
  });

  it.each([
    ['uz-Latn', uzLatn],
    ['uz-Cyrl', uzCyrl],
    ['ru', ru],
  ])('%s has no empty translations', (_name, file) => {
    for (const text of valuesOf(file)) {
      expect(typeof text === 'string' && text.trim().length > 0).toBe(true);
    }
  });
});
