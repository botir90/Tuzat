// Root ESLint config (flat config) shared by every package in the monorepo.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.expo/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // React rules for the mobile app and the admin panel.
  {
    files: ['apps/mobile/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  // The admin panel runs in a browser.
  {
    files: ['apps/admin/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  // Must be last: turns off rules that conflict with Prettier formatting.
  prettier,
);
