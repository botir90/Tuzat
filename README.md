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

### Phone cannot connect ("Something went wrong" in Expo Go)

This happens on Windows, especially when the laptop uses the **phone's hotspot**.

1. **Make the network Private.** Windows Firewall blocks Node.js on "Public" networks.
   Open PowerShell **as Administrator** and run (use your network name from `Get-NetConnectionProfile`):
   ```powershell
   Set-NetConnectionProfile -Name "<network name>" -NetworkCategory Private
   ```
2. **Turn off VPNs** while developing.
3. **Tell Expo the right IP.** The laptop has several network adapters, and Expo may pick the wrong one.
   Find the Wi-Fi adapter's IPv4 address with `ipconfig`, then:
   ```powershell
   $env:REACT_NATIVE_PACKAGER_HOSTNAME = "<laptop Wi-Fi IP>"
   pnpm --filter @usta/mobile start
   ```
   In Expo Go you can also tap **Enter URL manually** and type `exp://<laptop Wi-Fi IP>:8081`.

The hotspot IP can change after reconnecting, so check `ipconfig` again if it stops working.

### Installable APK (no Expo Go needed)

`apps/mobile/eas.json` has a `preview` profile that builds an APK in the cloud and gives a download link:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

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
