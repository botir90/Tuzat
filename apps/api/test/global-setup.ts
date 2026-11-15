import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './test-env';

/** Runs once before all tests: brings the test database schema up to date. */
export default function setup(): void {
  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
}
