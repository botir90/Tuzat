// Runs "prisma migrate dev <args>" and then "prisma generate".
// (Prisma 7 no longer regenerates the client after a migration.)
// Usage: pnpm db:migrate --name add_something
import { execFileSync } from 'node:child_process';

const run = (args) =>
  execFileSync('pnpm', ['exec', 'prisma', ...args], { stdio: 'inherit', shell: true });

run(['migrate', 'dev', ...process.argv.slice(2)]);
run(['generate']);
