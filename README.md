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
- **Docker Desktop** (runs the local PostgreSQL database and file storage)
- **Expo Go** app on your Android phone (from Google Play)

## First-time setup

```bash
# 1. Install all dependencies (for every package)
pnpm install

# 2. Create the API environment file
cp apps/api/.env.example apps/api/.env

# 3. Start the database and file storage (Docker Desktop must be running)
docker compose up -d

# 4. Create the tables and fill the catalog (regions, districts, categories, prices)
pnpm --filter @usta/api exec prisma migrate deploy
pnpm --filter @usta/api db:generate
pnpm --filter @usta/api db:seed

# 5. Create the database used by automated tests (once)
docker exec usta-postgres createdb -U usta usta_test
```

`docker compose up -d` starts two containers:

| Container       | What                                                           | Port |
| --------------- | -------------------------------------------------------------- | ---- |
| `usta-postgres` | PostgreSQL database                                            | 5432 |
| `usta-storage`  | SeaweedFS, S3-compatible storage for photos and voice messages | 8333 |

## Run the API

```bash
pnpm --filter @usta/api dev
```

Open http://localhost:3000/health in a browser. You should see:

```json
{ "status": "ok", "database": "up", "time": "..." }
```

If `database` is `"down"`, the database is not running: start Docker Desktop and run `docker compose up -d`.

**SMS codes:** in development no real SMS is sent. The code appears in the API terminal:
`📱 SMS to +998901234567: Tasdiqlash kodi: 123456`. Any phone number works, so you can create
several test accounts.

The app finds the API automatically (the same laptop IP as Expo, port 3000). To use another
address, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`.

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

## Test the whole flow on one phone

You need two accounts (any numbers: the SMS code is printed in the API terminal).

1. **Customer** (number A): choose a language → "I need a master" → choose
   _Xorazm → Urganch shahri_. Open a category: you will see **"No masters here yet"**,
   because no verified master works there yet.
2. **Settings → switch to master mode**, log out, log in with number B. Fill the 3 onboarding
   screens (the same category and _Urganch shahri_). The profile shows **"Waiting for verification"**.
3. **Verify the master** (until the admin panel exists in M6):
   ```bash
   pnpm --filter @usta/api master:verify <number B>
   ```
   Reopen the app: the **"Accepting orders"** switch and the orders feed appear.
4. Log out, switch to customer mode, log in with number A. Open the category → **Call a master** →
   describe (text, voice, photos) → address → time → send.
5. Log in as B (master): the request is in the feed → open it → **send an offer**.
6. Log in as A: **My requests** → the request → **choose the master** → the job screen opens.
7. As B: **On the way → Started**, then **propose a new price**; as A approve or decline it;
   as B press **Done**. The customer sees the final price and the 14-day guarantee.

**Push notifications** do not work in Expo Go on Android (Expo's rule since SDK 53). They need
an installable build: run `npx eas-cli@latest init` once in `apps/mobile` (adds the project id to
`app.json`), then build the APK above. Everything else works in Expo Go.

## Checks (run before every commit)

```bash
pnpm typecheck      # TypeScript in all packages
pnpm lint           # ESLint
pnpm format:check   # Prettier (use `pnpm format` to fix)
pnpm test           # Vitest in all packages
```

## Database (Prisma)

```bash
pnpm --filter @usta/api db:migrate --name what_changed  # after editing schema.prisma
pnpm --filter @usta/api db:seed                         # (re)fill the catalog, safe to repeat
pnpm --filter @usta/api db:studio                       # web UI to browse the data
pnpm --filter @usta/api master:verify 901234567         # mark a master as verified (dev only)
```

## Useful notes

- The app name is a placeholder. It lives only in `packages/shared/src/app.ts` and `apps/mobile/app.json`.
- All user-facing text lives in `apps/mobile/src/i18n/locales/*.json`. Every key must exist in all 3 languages (a test checks this).
- Never commit `.env` files. Add new variables to `.env.example` instead.
- API tests use a separate database (`usta_test`); its tables are wiped between tests.
- Only **Xorazm** is active at first (pilot). Other regions show the "no masters yet" screen and
  collect phone numbers in the waitlist.
- Expo Router route types are generated by `expo start`. After a fresh clone, run
  `pnpm --filter @usta/mobile start` once before `pnpm typecheck`.
