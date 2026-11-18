import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    // All test files share one test database, so run them one after another.
    fileParallelism: false,
    // Integration tests talk to a real database; give slow laptops enough time.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
