# Progress

_Updated after every step. After a restarted conversation: read `CLAUDE.md`, `design/DESIGN.md` and this file, then continue from "Next"._

## Current milestone

**M6 Trust + admin: Review (tags), Dispute/complaint, MasterEarnings from the design.**

M5 done (2026-11-23): Offers.html (offer cards: avatar, rating, price/arrival boxes, choose),
MasterProfile.html (badges, stats, about, typical prices, work photos, reviews, choose from offer),
JobStatus.html (teal header, timeline with times, person card with call, price-change card,
main action pinned at the bottom).

## Status by milestone

| Milestone           | Status                         | What is missing                                                                                        |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| M0 Setup            | ✅ done                        | —                                                                                                      |
| M1 Auth and roles   | 🟡 logic done                  | Language picker rebuilt from `design/screens/Main.html` + `theme.ts` + Inter font (needs design files) |
| M2 Catalog          | 🟡 logic done                  | Customer Home rebuilt from `design/screens/Home.html` (needs design files)                             |
| M3 Requests         | ✅ done (incl. Yandex map pin) | Restyle to the design when it arrives                                                                  |
| M4 Master side      | ✅ done                        | Restyle to the design                                                                                  |
| M5 Jobs             | 🟡 mostly done                 | Master profile: "prices" block; restyle                                                                |
| M6 Trust + admin    | 🟡 mostly done                 | Review **tags**; **master earnings** screen                                                            |
| M6.5 Chat and calls | ⬜ not started                 | Needs a LiveKit account (Botir) and an Expo dev build                                                  |
| M6.7 Payments       | ⬜ not started                 | Backend can be built now (fake provider); screens need design                                          |
| M6.9 Growth         | ⬜ not started                 | —                                                                                                      |
| M7 Release prep     | ⬜ not started                 | —                                                                                                      |

## Next

1. M6 gaps that need no design: review tags (API + tests), master earnings (API + tests).
2. M6.7 payments backend: data model, cash flow, commission to master balance, fake provider, tests.
3. When the design arrives: rebuild screens M1 → M6 to match it, then continue M6.5.

## Decisions

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
- [ ] Before M6.5: create a LiveKit Cloud account (free tier) — exact steps will follow.
- [ ] Before M6.7 real payments: MChJ, bank account, Click/Payme marketplace contract, lawyer check.
- [ ] **Urgent:** free disk space on `C:` (0.4 GB left; Docker hangs when it is full). Move Docker's disk to `D:` (Docker Desktop → Settings → Resources → Disk image location). Optional: limit WSL memory.
