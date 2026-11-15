# APP_NAME

A mobile app for finding a trusted home-repair master (usta) in Uzbekistan.
The full project brief is in [CLAUDE.md](CLAUDE.md).

## Project structure

```
apps/
  api/       Backend: Node.js + Fastify + Prisma (PostgreSQL)
  mobile/    Mobile app: React Native + Expo + Expo Router
packages/
  shared/    Types, constants and Zod schemas used by both api and mobile
```

This is a **pnpm monorepo**: one repository, several packages, one `pnpm install`.

## What you need

- **Node.js 22 or newer** (`node -v`)
- **pnpm** (`npm install -g pnpm`)
- **Docker Desktop** (for the local PostgreSQL database)
- **Expo Go** app on your Android phone (from Google Play)

## First-time setup

```bash
# 1. Install all dependencies (for every package)
pnpm install

# 2. Create the API environment file
cp apps/api/.env.example apps/api/.env

# 3. Start the database (Docker Desktop must be running)
docker compose up -d
```

## Run the API

```bash
pnpm --filter @usta/api dev
```

Open http://localhost:3000/health in a browser. You should see:

```json
{ "status": "ok", "database": "up", "time": "..." }
```

If `database` is `"down"`, the database is not running: start Docker Desktop and run `docker compose up -d`.

## Run the mobile app

```bash
pnpm --filter @usta/mobile start
```

A QR code appears in the terminal. Open **Expo Go** on your phone and scan it.
Your phone and computer must be on the **same Wi-Fi network**.
If it does not connect, try `pnpm --filter @usta/mobile start -- --tunnel`.

## Checks (run before every commit)

```bash
pnpm typecheck      # TypeScript in all packages
pnpm lint           # ESLint
pnpm format:check   # Prettier (use `pnpm format` to fix)
pnpm test           # Vitest in all packages
```

## Database (Prisma)

```bash
pnpm --filter @usta/api db:migrate    # create/apply a migration after editing schema.prisma
pnpm --filter @usta/api db:studio     # open a web UI to browse the data
```

## Useful notes

- The app name is a placeholder. It lives only in `packages/shared/src/app.ts` and `apps/mobile/app.json`.
- All user-facing text lives in `apps/mobile/src/i18n/locales/*.json`. Every key must exist in all 3 languages (a test checks this).
- Never commit `.env` files. Add new variables to `.env.example` instead.
