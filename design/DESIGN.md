# Design Guide for the Mobile App

This folder is the **visual source of truth** for `apps/mobile`. Read it together with `CLAUDE.md`.

```
design/
  DESIGN.md        ← this file: rules, components, screen list
  theme.ts         ← design tokens (colors, spacing, radius, typography, sizes)
  screens/*.html   ← one reference mockup per screen (390×844 phone frame)
```

## How to use the reference screens

- Each `screens/*.html` file is a **static HTML mockup** of one screen, with inline styles. Open it in a browser to see it, and read its markup to get exact sizes, colors, spacing and text.
- They are **references, not code to copy**. Rebuild each screen with React Native components (`View`, `Text`, `Pressable`, `TextInput`, `FlatList`, `ScrollView`) and the tokens in `theme.ts`.
- Ignore web-only parts of the files: `<script src="./support.js">`, `<x-dc>`, `<helmet>`, `<sc-for>`, `<sc-if>`, the `<script type="text/x-dc">` block (it only holds sample data for the mockup) and `<a href="X.dc.html">` (in the app these are Expo Router navigations).
- All visible text is sample Uzbek copy. In the app it must come from i18n keys (`uz-Latn`, `uz-Cyrl`, `ru`). Names, prices and ratings in the mockups are **sample data**, never hard-code them.
- Icons in the mockups are inline stroke SVGs. In the app use one icon set consistently (e.g. `lucide-react-native` with `react-native-svg`), stroke width ~2, same visual style.
- When a screen is built, compare it with the mockup on a real Android phone. If something can't be done exactly, keep the layout and hierarchy and tell Botir what is different.

## Visual style

- **Look:** calm, trustworthy, friendly. Deep teal primary (`#0F6B5C`), warm off-white background (`#F6F7F4`), white cards, gold accent only for promos and bonuses, indigo only for referral/bonus cards.
- **Font:** Inter (`@expo-google-fonts/inter`), weights 400/600/700/800. Headings are heavy (800) with slight negative letter spacing.
- **Shapes:** rounded. Cards 18–20 radius, buttons 14–16, banners 24, avatars fully round.
- **Contrast:** every text color in `theme.ts` passes WCAG AA (4.5:1) on its intended background. Don't invent new grays; use the tokens.
- **No** gradients, emoji or decorative clutter. Color shows meaning (green = safe/done, gold = bonus/promo, orange = urgent, red = end call only).

## Reusable components to build (in `apps/mobile/src/components/`)

| Component | Used on | Notes |
|---|---|---|
| `PrimaryButton` | almost every screen | height 60, radius 16, teal bg, white 18/700 text; loading + disabled states |
| `SecondaryButton` | offers, dispute | height 50–56, teal or warm outline |
| `ScreenHeader` | inner screens | 44×44 round white back button + title (20/800) + optional subtitle |
| `Card` | everywhere | white, radius 18, padding 16, soft shadow |
| `InfoBanner` | home, payment, profile | icon + title + text; variants: `safe` (teal soft), `promo` (gold soft), `urgent` (orange soft), `info` (blue soft) |
| `CategoryTile` | home | 64×64 colored rounded square + label below; colors from `categoryColors` |
| `MasterCard` | home carousel, offers | avatar with verified mark, name, category, rating + jobs count |
| `OfferCard` | offers | master row + price/arrival boxes + select button |
| `Chip` / `ChipGroup` | time picker, review tags, ETA, dispute reasons | selected = 2px teal border + teal soft bg |
| `VoiceRecorderButton` | new request, chat, dispute | big teal button with mic icon |
| `VoiceMessagePlayer` | master feed, chat | round play button + waveform + duration |
| `PhotoPicker` | new request, review, dispute | thumbnails + dashed "add photo" tile, max 5 |
| `StatusTimeline` | job status | vertical steps: done (filled teal), current (teal ring, bold), upcoming (gray) |
| `PriceRow` / `PriceSummary` | payment, review, master payout | label left, amount right, total row bold |
| `TabBar` | customer & master home | 4 tabs (customer) / 3 tabs (master), height 76, active = teal |
| `RatingStars` | review, profiles | 44px tappable stars on review screen, small read-only stars elsewhere |
| `Badge` | profiles, payment | small rounded label: TOP USTA (gold), verified (teal), on time (blue) |

## Screens

| Ref file | Screen | Role | Milestone / phase |
|---|---|---|---|
| `Main.html` | Language picker + role choice | both | M0 / M1 |
| `Home.html` | Customer home (scrolls): address, search with mic, promo banner, 24/7 emergency, categories, seasonal tip, top masters, popular services with prices, before/after, referral banner, trust row, tab bar | customer | M2 (core blocks); promo, referral, before/after in Phase 2 |
| `NewRequest.html` | Create request in 3 steps: problem (text/photo/voice), address + landmark, time | customer | M3 |
| `Offers.html` | Offers list: master, rating, jobs, price, arrival, select | customer | M5 |
| `MasterProfile.html` | Master profile: badges, stats, about, prices, portfolio, reviews, chat + select | customer | M5 / M6 |
| `JobStatus.html` | Job status timeline, master card with chat + call, price change approval card | customer | M5 |
| `Chat.html` | Chat with text, voice, photos, system messages, quick replies | both | Phase 2 |
| `Call.html` | In-app voice call (dark screen), hidden numbers, mute / speaker / chat / end, fallback to normal call | both | M6.5 (in-app calls) |
| `Review.html` | Job done: stars, tags, comment, photo, payment summary, tip, bonus earned | customer | M6 (payment block: Phase 2) |
| `Payment.html` | Pay when choosing master: "your money is safe" steps, price split (labor/parts), Click / Payme / cash | customer | Phase 2 (escrow) |
| `ConfirmJob.html` | "Was the job done well?": held amount, approved parts receipt, auto-release countdown, release / problem | customer | Phase 2 (escrow) |
| `Dispute.html` | Report a problem: money frozen notice, reasons, photo/voice, what happens next | customer | M6 (complaint) / Phase 2 (frozen money) |
| `Bonus.html` | Bonus balance + level, referral code, share via Telegram, ways to earn | customer | Phase 3 |
| `Profile.html` | "My home": appliances with service reminders, active guarantee, menu (favorites, addresses, history, language, support, become a master) | customer | Phase 2–3 |
| `MasterFeed.html` | Master: availability toggle, new requests with voice + photo, distance, time, send offer | master | M4 |
| `MasterOffer.html` | Master: send offer (price, ETA chips, message) | master | M4 |
| `MasterEarnings.html` | Master: weekly earnings chart, month, rating, recent jobs | master | M6 |
| `MasterPayout.html` | Master: payment held by platform, parts receipt upload, payout breakdown with commission | master | Phase 2 (escrow) |

Build screens **in the milestone order from `CLAUDE.md`**. A screen marked for a later phase may be built early only as a UI shell if Botir asks.

## Behaviour notes the mockups can't show

- **Home** scrolls vertically; the tab bar is fixed at the bottom. The "top masters" row scrolls horizontally.
- **Search with mic** and **NewRequest voice button**: hold-to-record or tap-to-start/stop, show recording time, allow re-record.
- **Emergency (24/7)** creates a request with time = "Now" and a higher priority for nearby available masters.
- **Price change card** (JobStatus) appears only while a `PriceChange` is `PENDING`.
- **Auto-release countdown** (ConfirmJob) shows the real remaining time from the backend.
- **Call screen** opens from JobStatus, Chat and MasterProfile call buttons only while the job is active.
- **Empty, loading and error states** are not drawn: design them in the same style (Card + icon + short friendly text + one action button).
- All touch targets ≥ 48dp; support system font scaling; every icon-only button has an `accessibilityLabel`.
