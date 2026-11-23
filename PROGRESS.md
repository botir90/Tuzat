# Progress

_Updated after every step. After a restarted conversation: read `CLAUDE.md`, `design/DESIGN.md` and this file, then continue from "Next"._

## Current milestone

**M6.9 part B: 24/7 emergency, badges (on time), before/after photos, "My home" (Profile.html).**

M6.9 part A done (2026-11-23): bonuses (levels, cashback for online, +3 000 photo review), referral
(30 000 both, Telegram share), promo codes (BIRINCHI seeded, admin API, home banner), promo and
bonus (up to 50%) on the Payment screen; Bonuses tab.

## Status by milestone

| Milestone           | Status                             | What is missing                                                                                                          |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| M0 Setup            | ✅ done                            | —                                                                                                                        |
| M1 Auth and roles   | 🟡 logic done                      | Language picker rebuilt from `design/screens/Main.html` + `theme.ts` + Inter font (needs design files)                   |
| M2 Catalog          | 🟡 logic done                      | Customer Home rebuilt from `design/screens/Home.html` (needs design files)                                               |
| M3 Requests         | ✅ done (incl. Yandex map pin)     | Restyle to the design when it arrives                                                                                    |
| M4 Master side      | ✅ done                            | Restyle to the design                                                                                                    |
| M5 Jobs             | 🟡 mostly done                     | Master profile: "prices" block; restyle                                                                                  |
| M6 Trust + admin    | 🟡 mostly done                     | Review **tags**; **master earnings** screen                                                                              |
| M6.5 Chat and calls | 🟡 code done, needs dev build test | Full-screen ringing when the app is closed (CallKit / ConnectionService) is a follow-up; now a loud "calls" notification |
| M6.7 Payments       | ⬜ not started                     | Backend can be built now (fake provider); screens need design                                                            |
| M6.9 Growth         | ⬜ not started                     | —                                                                                                                        |
| M7 Release prep     | ⬜ not started                     | —                                                                                                                        |

## Next

1. M6 gaps that need no design: review tags (API + tests), master earnings (API + tests).
2. M6.7 payments backend: data model, cash flow, commission to master balance, fake provider, tests.
3. When the design arrives: rebuild screens M1 → M6 to match it, then continue M6.5.

## Decisions

- 2026-11-23: Levels by finished orders: Bronze 0–4 (3%), Silver 5–14 (5%), Gold 15+ (7%). Order cashback only for online payments (CLAUDE.md 7a); in the cash pilot bonus comes from referrals (30 000) and photo reviews (+3 000).
- 2026-11-23: Promo and bonus discounts are paid by the platform: the master still earns the full price; the discount is credited to the master's balance (negative owed = we owe the master). Commission is counted on the full labor.
- 2026-11-23: A friend's referral code can be entered once, on the Bonuses screen, before the first finished order.

- 2026-11-23: Commission = COMMISSION_PERCENT (5%) of labor only (parts are not charged); first 90 days free. Cash jobs: commission is recorded as the master's debt; an admin records when it is paid.
- 2026-11-23: Guarantee stays for cash jobs during the pilot (open question answered by default: we keep it until online payment is on). Payment.html shows cash as "to the master after the job", not "no guarantee".
- 2026-11-23: After choosing a master the customer lands on the Payment screen; cash is the default and only choice until the flag is on.
- 2026-11-23: Auto-release and reminders run in the API every 5 minutes (and on reads), no extra job queue.

- 2026-11-23: Chat uses simple polling (every 4 s while open) + push, not websockets. Boring and works on 3G; switch later if needed.
- 2026-11-23: In Expo Go the call screen offers a normal phone call (no native WebRTC there). In-app calls work in the development build / store app.
- 2026-11-23: An incoming call rings as a MAX-importance notification on the "calls" channel; when the app is open, the call screen opens by itself. Native full-screen call UI is a follow-up.

- 2026-11-23: Dispute.html "money frozen" banner is shown only after online payments exist (M6.7); with cash there is nothing to freeze.
- 2026-11-23: Master settings open from the gear button on the Earnings screen (the Earnings tab replaced Settings).
- 2026-11-23: Admin cases table shows the complaint reason and attachment count inside the text column (no admin UI change needed).

- 2026-11-23: The design canvas (claude.ai artifact) has a broken JobStatus: its body was pasted into Chat.dc.html. The app follows the intact copy in design/ (design.zip). Botir can fix the canvas or ask Claude to.
- 2026-11-23: MasterProfile "Prices" = the price list of the master's trades (region prices), not personal prices; "years of experience" and "reply time" are not collected, so the stats show rating, jobs done and reviews.
- 2026-11-23: TOP badge = rating ≥ 4.8 with ≥ 10 reviews (until admin-managed badges in M6.9).

- 2026-11-23: Feed cards show the district, not the distance in km: the exact address stays hidden until the offer is accepted. Distance needs the master's live location (Phase 2).
- 2026-11-23: Master tab bar: Orders, My jobs, Settings. The "Earnings" tab (MasterFeed.html) replaces Settings in M6.

- 2026-11-21: Maps stay on the Yandex **JavaScript API in a WebView** (works in Expo Go). DESIGN.md mentions Yandex MapKit (native SDK); switch when we move to the dev build (M6.5), the screen layout stays the same.
- 2026-11-21: Apartment and floor are added to the address line sent to the API (no new DB fields).

- 2026-11-21: Categories.html lists **36** trades (8+12+8+8), not 35; the app uses exactly the file.
- 2026-11-21: Customer tab bar has 3 tabs (Home, Orders, Profile). The "Bonuses" tab from Home.html comes with M6.9.
- 2026-11-21: Home search opens "All services" with a search field (searches trade names in all 3 languages). Voice search needs speech-to-text (Phase 3).
- 2026-11-21: Dev DB and storage use 127.0.0.1 instead of localhost (localhost hit a broken IPv6 WSL relay on this laptop).

- 2026-11-20: design files arrived (design.zip) and live in `design/`.
- 2026-11-20: Main.html shows language + role on one screen, so the old separate language-first step is gone; `/language` stays only for changing the language from Settings.
- 2026-11-20: Screens not rebuilt yet keep working with the restyled shared components (BigButton, Notice, Screen, TextField, ListItem, Chips now follow the design).
- Guarantee during the cash-only pilot: _waiting for Botir_ (see open questions). Current code gives every DONE job a 14-day guarantee.

## Open questions (for Botir)

2. **Guarantee and cash:** CLAUDE.md 7a says only online-paid jobs get the guarantee, but the pilot is cash-only. Proposal: cash jobs keep the guarantee until online payment is switched on.

## Botir must do

- [x] Put the `design/` folder into the repo root.
- [x] LiveKit Cloud account + project `usta`; keys in apps/api/.env (checked: API answers 200).
- [ ] Before the Play Store release: delete the LiveKit key APIBo4kQyx5ws4X and create a new one (it was shown in a chat screenshot). Also delete the unused key APIkgKgktjQMetu.
- [ ] Before M6.7 real payments: MChJ, bank account, Click/Payme marketplace contract, lawyer check.
- [ ] **Urgent:** free disk space on `C:` (0.4 GB left; Docker hangs when it is full). Move Docker's disk to `D:` (Docker Desktop → Settings → Resources → Disk image location). Optional: limit WSL memory.
