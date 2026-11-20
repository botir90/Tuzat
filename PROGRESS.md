# Progress

_Updated after every step. After a restarted conversation: read `CLAUDE.md`, `design/DESIGN.md` and this file, then continue from "Next"._

## Current milestone

**Blocked on design files** — the roadmap needs `design/DESIGN.md`, `design/theme.ts` and
`design/screens/*.html`, but there is no `design/` folder in the repo yet (see "Botir must do").

Meanwhile: work that doesn't depend on the design (backend, business rules, tests).

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

- 2026-11-20: `design/` is missing, so screen work waits; backend work continues in roadmap order where possible.
- Guarantee during the cash-only pilot: _waiting for Botir_ (see open questions). Current code gives every DONE job a 14-day guarantee.

## Open questions (for Botir)

1. **Design files:** where are `design/DESIGN.md`, `design/theme.ts`, `design/screens/*.html`?
2. **Guarantee and cash:** CLAUDE.md 7a says only online-paid jobs get the guarantee, but the pilot is cash-only. Proposal: cash jobs keep the guarantee until online payment is switched on.

## Botir must do

- [ ] Put the `design/` folder into the repo root (or send the files).
- [ ] Before M6.5: create a LiveKit Cloud account (free tier) — exact steps will follow.
- [ ] Before M6.7 real payments: MChJ, bank account, Click/Payme marketplace contract, lawyer check.
- [ ] Free disk space on `C:` (only ~1 GB left; it made Docker hang). Optional: limit WSL memory.
