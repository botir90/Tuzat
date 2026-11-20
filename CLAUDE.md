# APP_NAME: Project Brief for Claude Code

> **The app name is not chosen yet.** Botir will choose it and tell you. Until then use the placeholder `APP_NAME`.
> Keep the name in **one place only** (a shared config constant + `app.json`), never hard-code it across screens, so renaming takes one change.
> The final name must not copy or imitate any existing brand.
> This file is the single source of truth for the project. Read it fully before doing any work.

---

## 0. How to work with me (the developer)

- My name is **Botir**. I live in **Khorezm (Xorazm), Uzbekistan**.
- I studied backend development and know **JavaScript and TypeScript**, but I haven't coded for about 7 months. Treat me as a **junior developer who is relearning**.
- **Always reply to me in Uzbek (Latin script).** Code, code comments, commit messages and file names stay in English.
- Work in **small steps**. For every step:
  1. Explain in 2–4 sentences what we are going to do and why.
  2. Write the code.
  3. Briefly explain any new or non-obvious TypeScript/React concept you used.
  4. Run it (type check, tests, or start the app) and confirm it works before moving on.
  5. Make a git commit with a clear message.
- Don't jump ahead to later phases. Finish the current milestone first.
- If something needs my action (installing a tool, creating an account, testing on my phone, talking to real users), stop and tell me exactly what to do, step by step.
- Never put secrets (API keys, tokens, passwords) in code or in git. Use `.env` files and add them to `.gitignore`. Provide `.env.example`.
- Prefer simple, boring, well-known solutions over clever ones. I need to understand and maintain this code myself.
- **`design/` is the visual source of truth.** Every screen must follow `design/screens/*.html` and `design/theme.ts` (colors, fonts, spacing). Read `design/DESIGN.md` before building any screen.
- **Progress file:** keep `PROGRESS.md` in the repo root up to date after every step (current milestone, done, next, open questions, things Botir must do). After a restarted conversation, read `CLAUDE.md`, `design/DESIGN.md` and `PROGRESS.md` and continue from there.
- Work autonomously through the milestones in order. Stop and ask only for things only Botir can do (install a tool, create an account, get an API key, test on the phone, make a business decision), with exact steps in Uzbek.
- One git branch per milestone; merge into `main` when the milestone is finished and checked. At the end of each milestone: a short summary in Uzbek (what was built, how to test it on the phone, what Botir must do, 1–3 new concepts explained simply).
- If something in the plan is unclear or impossible, choose the simplest safe solution, write the decision into `PROGRESS.md`, and mention it in the milestone summary.

---

## 1. Vision

Build **the most convenient and trustworthy app in Uzbekistan for finding a home-repair master (usta)**: plumbers, electricians, AC technicians, appliance repair and more.

The app is built for **all of Uzbekistan**: all 12 regions (viloyat), the Republic of Karakalpakstan and Tashkent city, with their districts, from day one.

**Launch strategy:** the product and data model cover the whole country, but masters are onboarded **region by region** (an empty region feels broken to customers). The first real-world pilot is in **Khorezm**, because Botir lives there and can verify masters in person. Then we expand to other regions, where competitors (mainly Tashkent-focused) are weak. In Tashkent we must win on convenience and trust, not on catalog size.

When a customer opens a region or category with no available masters yet, show an honest, friendly screen: "No masters here yet, leave your number and we'll notify you" (and use this as demand data).

**Our promise to customers:** *"A verified master, a clear price before the work starts, and a guarantee after it."*

**Our promise to masters:** *"Real orders, no pay-to-respond, you pay only a small fee when you actually earn."*

Both sides must find the app **simple, fast and pleasant**. If a 55-year-old customer or a master with a cheap Android phone can't use a screen without help, the screen is wrong.

---

## 2. Market research summary (why we will win)

**Existing competitors:**
- **Ustabor.uz**: the biggest player (since 2016, ~100K+ Android downloads, mostly a catalog). Strong in Tashkent, weak in the regions. "Master for an hour" service is Tashkent-only.
- **Ustaman, UserUz, Ustahub, Masters UZ**: smaller apps.
- **Handyman Uzbekistan** (2026, AI assistant + GPS) and **Home Service** (launching 2026 in Tashkent, then 12 cities): new competitors, so speed matters.
- **OLX.uz and Telegram groups**: what most people outside Tashkent actually use today. **This is our real competitor: people asking a neighbor.**

**Customer pain points (from reviews of similar platforms in Uzbekistan, Russia and India):**
1. The price quoted on the phone grows after the job ("I said 7, now it's 17").
2. The master arrives and says "you need extra parts", and the bill multiplies.
3. Prepayment scams: a master takes money and disappears.
4. Fake reviews: only positive reviews make people distrust the site.
5. Poor quality and no guarantee: "nothing was fixed but I paid."
6. Masters are late, don't call back, or never show up.
7. Hard onboarding: install, register, wait for SMS codes that don't arrive.
8. Many services are Russian-only or Tashkent-only.

**Master pain points:**
1. Few real orders: the catalog is a "pit" where every listing gets lost.
2. Pay-per-response models (like Profi.ru): masters pay to respond and lose the money if the client picks someone else.
3. Fake orders that waste masters' money and time.
4. Sudden bans and tariff changes without explanation.

**Our answers (these are core product rules, not nice-to-haves):**

| Pain | Our rule |
|---|---|
| Price grows after the job | Every service has a **published price range**. Any price change must be **approved by the customer inside the app** before work continues. |
| Prepayment scams | **No prepayment to masters.** Customer pays after the job is done. Later: payment held by the platform (escrow) via Click/Payme. |
| Fake reviews | **Only a customer with a completed order** can review that master. Show the review count and all reviews, including negative ones. |
| No guarantee | Every completed order has a **guarantee period** (default 14 days). A "Problem came back" button creates a free return visit. |
| Unverified masters | **Verified badge** only after an admin checks the passport and work samples: in person where possible, otherwise by **remote verification** (passport photo + selfie + short video call). |
| Late / no-show | Master must confirm arrival time. The customer sees status ("On the way, ~20 min"). No-shows lower the master's ranking. |
| Pay-to-respond | Masters **never pay to see or respond to orders**. Only a small **commission (5–10%) on completed jobs**. The first 3 months are free. |
| Fake orders | Customers are verified by phone number (OTP). Limits on open requests per customer. |
| Hard onboarding | The customer can browse without an account. Phone login only at the moment of the first order. |
| Language | Full **Uzbek Latin, Uzbek Cyrillic and Russian** from day one. |

---

## 3. Users and roles

One mobile app with **two modes**. The user chooses the mode at first launch and can switch later.

- **Customer (Mijoz):** creates repair requests, compares offers, chooses a master, tracks the job, pays, rates, claims the guarantee.
- **Master (Usta):** builds a profile, receives matching requests, sends offers, manages jobs, sees earnings.
- **Admin (us):** verifies masters, manages categories and price lists, handles complaints. Uses a simple web admin panel (separate app).

---

## 4. UX principles (apply to every screen)

1. **Three steps to an order:** category → describe (photo, voice or text) → address and time. Nothing more is required.
2. **Voice first:** many users prefer voice messages to typing. Every text input where a user describes something must also accept a **voice recording**.
3. **Photos:** up to 5 photos per request, compressed on the device before upload.
4. **Big, clear UI:** minimum touch target 48dp, base font size ≥ 16, high contrast, simple icons with labels. Must work for older users.
5. **Low-end Android first:** test on a cheap Android phone (2–3 GB RAM). Small app size, fast startup, lazy loading, images compressed. Must work on slow 3G/4G and survive brief network loss (retry, show clear offline state).
6. **No dead ends:** every error message says what happened and what to do next, in the user's language. Never show raw technical errors.
7. **One-tap call:** customer and master can call each other from the job screen. Calls are allowed only after the master is chosen.
8. **Clear statuses everywhere:** the user always knows "what is happening now" and "what happens next".
9. **Friendly tone:** polite, warm Uzbek. Use "Siz" (formal you).
10. **Accessibility:** support system font scaling and screen readers (labels on all buttons).

### Customer flow (MVP)
1. Open the app → choose language → choose "I need a master".
2. Home: big category tiles (Plumber, Electrician, AC, Washing machine, Fridge, Gas boiler, Furniture assembly, Other).
3. Category → see the **price list** for typical jobs (e.g. "Replace a faucet: 80 000–150 000 so'm").
4. Create request: photo / voice / text, address (map pin + text landmark, e.g. "near the 5th school"; landmarks matter in Uzbekistan), preferred time (Now / Today / Choose a time).
5. Phone login (OTP) if not logged in yet.
6. Receive **up to 5 offers** from masters: price, arrival time, rating, number of completed jobs, verified badge.
7. Choose a master → status screen: Accepted → On the way → Working → Done.
8. If the master proposes a new price, the customer gets a prompt: "Approve / Decline".
9. Mark as done → pay (cash in MVP) → rate 1–5 stars + optional comment + photo.
10. Guarantee button available for 14 days.

### Master flow (MVP)
1. Open the app → choose "I am a master" → phone login.
2. **Simple onboarding (max 3 screens):** name + photo, categories + districts served, work-sample photos (optional). Profile shows "Waiting for verification" until an admin approves.
3. **Orders feed:** new requests in my categories and districts, nearest first. Each card: category, short description, photos, voice (play button), district, desired time, price range.
4. **Send offer in one screen:** price (pre-filled from the price list), arrival time, optional short message.
5. **My jobs:** status buttons (On the way → Started → Done), one-tap call, navigation to the address (open in Yandex Maps / Google Maps).
6. **Propose a price change** with a reason → customer approves in the app.
7. **Earnings screen:** this week / this month, commission owed, job history.
8. **Push notifications** for new matching requests, chosen offers and messages.
9. Availability toggle: "I'm accepting orders" on/off.

---

## 5. Feature scope by phase

### Phase 1: MVP (target ~8–10 weeks)
- Language selection (uz-Latn, uz-Cyrl, ru)
- Phone OTP login
- Customer: categories, price list, create request (photo, voice, text, address, time), receive offers, choose master, status tracking, approve price change, rate, guarantee claim
- Master: onboarding, verification status, orders feed, send offer, job status, price change request, earnings (simple), availability toggle
- Push notifications
- Admin web panel (basic): verify masters, manage regions (activate/deactivate), categories and prices, view orders, handle complaints, block users
- Cash payment only (record the amount in the app)

### Phase 2: Trust and payments
- In-app chat (text, photos, voice) between customer and chosen master
- Online payment via **Click** and **Payme** (later Uzum), with platform-held payment released after job completion
- Automatic commission calculation
- Master ranking algorithm (rating, completion rate, response time, no-shows)
- Complaint / dispute flow with admin
- Live "master on the way" location

### Phase 3: AI and growth
- **AI diagnosis:** the customer sends a photo or voice → AI suggests the likely problem, category and price range (Claude API vision for photos; a speech-to-text provider that supports Uzbek for voice; evaluate options when we get there)
- Voice-to-text for request descriptions
- Referral program ("invite a neighbor")
- Region-by-region expansion across Uzbekistan (regional admins or partners for master verification)
- iOS release

---

## 6. Tech stack

**Monorepo** (pnpm workspaces):
```
/apps
  /mobile   → React Native + Expo (TypeScript)
  /api      → Node.js + TypeScript backend
  /admin    → React + Vite web admin panel (TypeScript)   [start in Phase 1, after core flows]
/packages
  /shared   → shared TypeScript types, Zod schemas, constants (categories, statuses)
```

**Mobile (apps/mobile)**
- Expo (latest stable SDK) + TypeScript (strict mode)
- Expo Router for navigation
- TanStack Query for server state; Zustand for small local state
- react-hook-form + Zod for forms
- i18n: i18next + react-i18next, translation files for `uz-Latn`, `uz-Cyrl`, `ru`; no hard-coded user-facing strings
- expo-image-picker + image compression; expo-audio for voice recording and playback
- expo-notifications for push
- expo-location; map: start with a simple map pin picker; prefer a provider that works well in Uzbekistan (Yandex Maps has good local coverage; evaluate the React Native options when building the address screen)
- Secure token storage: expo-secure-store
- Android first, then iOS. Test via Expo Go during development; EAS Build for release.

**Backend (apps/api)**
- Node.js LTS + TypeScript (strict)
- **Fastify** (simple, fast, good TypeScript support)
- **PostgreSQL** + **Prisma** ORM
- Zod for request validation (schemas shared from `packages/shared`)
- Auth: phone OTP → short-lived JWT access token + refresh token
- SMS: an Uzbek SMS provider (e.g. Eskiz.uz); in development, log OTP codes to the console instead of sending SMS
- File storage: S3-compatible storage for photos and voice files (upload via pre-signed URLs)
- Push: Expo Push API
- Testing: Vitest
- Local development: Docker Compose for PostgreSQL

**Admin (apps/admin)**
- React + Vite + TypeScript, simple table-based UI. Admin login separate from mobile users.

**Code quality**
- ESLint + Prettier, TypeScript `strict: true` everywhere
- Conventional, small commits
- Each API endpoint has at least one test for the success path and one for a validation error

**Important legal note:** Uzbekistan's personal data law requires personal data of Uzbek citizens to be stored on servers located in Uzbekistan. Before the production launch we must check the current requirements and choose hosting accordingly. Development can use any hosting.

---

## 7. Data model (initial draft, refine while building)

- **User**: id, phone (unique), name, language, role (`CUSTOMER` | `MASTER` | `ADMIN`), createdAt, isBlocked
- **MasterProfile**: userId, photoUrl, bio, categories[], districts[], verificationStatus (`PENDING` | `VERIFIED` | `REJECTED`), isAvailable, ratingAvg, ratingCount, completedJobsCount
- **Category**: id, slug, names (uz-Latn / uz-Cyrl / ru), icon, sortOrder, isActive
- **PriceItem**: id, categoryId, names (3 languages), minPrice, maxPrice (in so'm)
- **Region**: id, names (3 languages), isActive (true when we have launched there), sortOrder. 14 regions: Toshkent shahri, Toshkent viloyati, Andijon, Farg'ona, Namangan, Samarqand, Buxoro, Navoiy, Qashqadaryo, Surxondaryo, Jizzax, Sirdaryo, Xorazm, Qoraqalpog'iston Respublikasi
- **District**: id, regionId, names (3 languages), lat, lng (center). Seed **all districts and district-level cities of Uzbekistan**; verify the list against an official source before seeding
- **WaitlistEntry**: id, phone, regionId, districtId, categoryId, createdAt (customers who want a service where we have no masters yet)
- **Request**: id, customerId, categoryId, description, photoUrls[], voiceUrl, districtId, address, landmark, lat, lng, desiredTime, status (`OPEN` | `ASSIGNED` | `CANCELLED` | `EXPIRED`), createdAt, expiresAt
- **Offer**: id, requestId, masterId, price, arrivalTime, message, status (`SENT` | `ACCEPTED` | `REJECTED` | `WITHDRAWN`)
- **Job**: id, requestId, offerId, customerId, masterId, agreedPrice, finalPrice, status (`ACCEPTED` | `ON_THE_WAY` | `IN_PROGRESS` | `DONE` | `CANCELLED`), timestamps per status, guaranteeUntil
- **PriceChange**: id, jobId, newPrice, reason, status (`PENDING` | `APPROVED` | `DECLINED`)
- **Review**: id, jobId (unique), customerId, masterId, stars, comment, photoUrls[], createdAt
- **GuaranteeClaim**: id, jobId, description, status
- **Complaint**: id, jobId, fromUserId, text, status, adminNote
- **PushToken**: userId, token, platform

**Business rules to enforce on the backend (not only in the UI):**
- A review can be created only for a `DONE` job, only by its customer, only once.
- A master sees only requests in their categories and districts, and only when `VERIFIED` and `isAvailable`.
- Max 5 offers per request; a request expires after 24 h without a choice.
- `finalPrice` may differ from `agreedPrice` only through an `APPROVED` PriceChange.
- A customer may have at most 3 `OPEN` requests at a time.
- Phone numbers are shared between the two sides only after an offer is accepted.

---

## 7a. Payment model (decided)

Platform-held payment (escrow) via a **licensed payment provider**.

- **Flow:** the customer pays online (Click/Payme) when choosing the master → the money is held by the payment provider, **not by us** → the customer taps "Job done" → the money is released to the master minus our commission. If the customer reports a problem, the money is frozen and an admin decides.
- **Auto-release:** if the customer neither confirms nor complains within 24 h after the master marks the job done, release automatically (send reminders first).
- **Labor and parts:** split the price into "labor" and "parts". The master uploads a receipt photo for parts; after the customer approves it, the parts money is released immediately.
- **Price changes:** an approved price change charges only the difference.
- **Payouts** to masters on the same day.
- **Cash:** allowed at the start, but online payment gives bonus cashback, and only online-paid jobs get the guarantee. For cash jobs the commission is charged to the master's balance.
- **Legal:** we never hold money ourselves and never use personal cards. Requires a legal entity (MChJ) and a marketplace/split-payment agreement with Click/Payme; check with a lawyer before launch.
- **MVP and pilot:** cash only, but design the data model now (`Payment`, `Payout`, `Hold`, `Dispute`, `MasterBalance` with statuses) so online escrow can be switched on later without rewriting.

---

## 8. Milestones (do them in order)

**M0: Setup (week 1)**
- Monorepo with pnpm workspaces, TypeScript strict, ESLint, Prettier, git
- `apps/api`: Fastify "health" endpoint + PostgreSQL via Docker Compose + Prisma connected
- `apps/mobile`: Expo app running on my phone via Expo Go, with Expo Router and i18n set up (3 languages, language picker screen)
- `packages/shared`: first shared types
- README with "how to run" instructions in simple English

**M1: Auth and roles**
- Phone OTP login (console OTP in development), JWT access + refresh, logout
- Role choice: Customer / Master
- Secure token storage in the app
- Language picker screen rebuilt exactly like `design/screens/Main.html` with `design/theme.ts` and the Inter font

**M2: Catalog**
- Categories, price list, all regions and districts of Uzbekistan (seed data)
- Prices may differ by region: support an optional per-region price override
- Region/district picker; "no masters yet" screen + waitlist
- Customer Home (`design/screens/Home.html`, core blocks) and price list screen

**M3: Requests**
- Create a request with text, up to 5 photos, voice recording, address + landmark + map pin, time (Now / Today / Choose)
- File uploads via pre-signed URLs
- "My requests" screen

**M4: Master side**
- Master onboarding (max 3 screens) and profile, verification status
- Orders feed with voice/photo playback, send offer, availability toggle
- Push notifications for new matching requests

**M5: Jobs**
- Offers list; master profile (portfolio, prices, reviews); choose a master
- Job status timeline, one-tap call (phone dialer for now), open address in maps
- Price change request and approval

**M6: Trust + admin**
- Reviews with tags and photos (only for DONE jobs), guarantee claim, complaints/disputes
- Master earnings screen
- Admin web panel: verify masters, regions, categories, prices, orders, complaints, block users

**M6.5: In-app chat and calls**
- Chat: text, photos, voice, quick replies, system messages
- In-app voice calls over the internet with LiveKit: phone numbers hidden; the backend issues short-lived tokens only for the customer and the master of an active job; incoming calls ring when the app is closed (push + CallKit / ConnectionService); mute, speaker, chat, end; fallback "switch to a normal phone call"; save call history (no audio recording)
- Needs an Expo development build: explain step by step how to build and install it on Botir's Android phone

**M6.7: Payments (escrow-ready)** — see section 7a
- Data model `Payment`, `Hold`, `Payout`, `Dispute`, `MasterBalance` with statuses
- Price split into labor and parts; parts receipt photo → customer approves → parts money released immediately
- Approved price changes charge only the difference
- Customer "Job done" releases the money minus commission; auto-release 24 h after the master marks the job done if there is no complaint (with reminders); a dispute freezes the money and an admin decides; same-day payouts
- Cash works now (commission goes to the master's balance)
- Online Click/Payme behind a feature flag, with a provider interface and a fake provider for development and tests. Real integration only after we have an MChJ and a marketplace contract (never hold money ourselves, never personal cards)
- Screens: Payment, ConfirmJob, Dispute, MasterPayout from `design/screens`

**M6.9: Growth**
- First-order promo code; seasonal promotions (admin-managed)
- 24/7 emergency request with priority
- Top masters and badges (TOP, verified, on time); before/after photos
- Bonus system: cashback per order, Bronze / Silver / Gold levels, referral code shared via Telegram (30 000 so'm for both), bonus pays up to 50% of an order
- "My home" (appliances with service reminders), favorite masters, saved addresses, order history, support chat

**M7: Release prep and pilot**
- Empty / loading / error states everywhere, offline handling
- Performance check on a low-end Android phone
- Security review
- EAS build, Google Play internal testing checklist, README update
- Pilot in Khorezm: bug fixes from real tests with 10–20 masters and first customers in Urgench
- A simple playbook for launching the next region (onboard masters first, then open the region for customers)

**Later (do NOT build now)**
- AI diagnosis from photo/voice
- iOS release
- Region expansion tools

---

## 9. Definition of "done" for every feature
- Works on a real Android phone via Expo Go (or the dev build, once M6.5 needs it)
- Screens match `design/screens/*.html` and use `design/theme.ts`
- All user-facing text is in 3 languages
- Loading, empty and error states are designed (not just the happy path)
- Backend validates input and enforces the business rules
- Tests pass, type check passes, lint passes
- Committed to git
