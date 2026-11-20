# Progress

_Updated after every step. After a restarted conversation: read `CLAUDE.md`, `design/DESIGN.md` and this file, then continue from "Next"._

## Current milestone

**M2 Catalog — rebuild the customer Home from `design/screens/Home.html`.**

M1 design done (2026-11-20): theme tokens from `design/theme.ts`, Inter font, lucide icons, base components
(AppText, PrimaryButton, SecondaryButton, Card, InfoBanner, ScreenHeader, LanguageOption), shared
components restyled, welcome screen = `Main.html` (language + role on one screen).

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
