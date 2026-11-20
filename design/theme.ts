/**
 * Design tokens for the mobile app.
 * Source of truth: design/DESIGN.md and the reference screens in design/screens/.
 * Put this file at apps/mobile/src/theme/theme.ts (or wherever the app keeps its theme).
 */

export const colors = {
  // Brand
  primary: '#0F6B5C', // main buttons, active tabs, links
  primaryDark: '#0A4F44', // pressed state, text on primarySoft
  primarySoft: '#E3F1EE', // selected chips, info cards
  primaryMuted: '#CFE3DE', // image placeholders

  // Accents (use sparingly)
  gold: '#F2B544', // promo badges, bonus highlights
  goldSoft: '#FFF6DE', // seasonal / tip cards
  goldText: '#5A4210', // text on goldSoft
  indigo: '#2D2A6E', // referral & bonus cards
  indigoText: '#D6D4F5', // secondary text on indigo
  urgent: '#C2410C', // emergency button icon background, notification badge
  urgentSoft: '#FFF1EA', // emergency card background
  urgentText: '#7A2A08', // text on urgentSoft
  danger: '#D92D20', // end call only
  telegram: '#229ED9', // "share via Telegram" button only
  star: '#C77700', // rating stars (outline / small)
  starFill: '#F2B544', // big rating stars on review screen

  // Neutrals
  bg: '#F6F7F4', // screen background
  surface: '#FFFFFF', // cards, inputs, tab bar
  text: '#15201E', // primary text
  textSecondary: '#4F5B59', // secondary text (passes 4.5:1 on bg and surface)
  textMuted: '#5B6866', // hints, captions
  border: '#D5DBD9', // input and chip borders
  divider: '#E3E7E5', // list separators
  placeholderBorder: '#9AA6A3', // dashed "add photo" buttons

  // Call screen (dark)
  callBg: '#0E2B26',
  callRing: '#7FD4C1',
} as const;

/** Category tile colors: background + icon color. Order matches the home screen. */
export const categoryColors = {
  plumber: { bg: '#E4EEFB', fg: '#1F5FAE' },
  electrician: { bg: '#FFF3D6', fg: '#9A6400' },
  airConditioner: { bg: '#E0F4F8', fg: '#0B6E85' },
  washingMachine: { bg: '#EEE8FA', fg: '#6B3FA0' },
  fridge: { bg: '#E3F1EE', fg: '#0F6B5C' },
  gasBoiler: { bg: '#FDECE2', fg: '#B4471A' },
  furniture: { bg: '#FBE7EF', fg: '#A3305E' },
  cleaning: { bg: '#ECEFEE', fg: '#3E4B49' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20, // default screen side padding
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8, // small badges
  md: 12, // small buttons, chips in grids
  lg: 14, // inputs, secondary buttons
  xl: 16, // primary buttons, small cards
  xxl: 18, // cards
  xxxl: 20, // big cards
  hero: 24, // promo banners
  pill: 999,
} as const;

/** Font: Inter (load with expo-font / @expo-google-fonts/inter). */
export const typography = {
  display: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '800' },
  h3: { fontSize: 18, fontWeight: '800' },
  bodyStrong: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  label: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 13, fontWeight: '400' },
  tiny: { fontSize: 12, fontWeight: '600' },
  button: { fontSize: 18, fontWeight: '700' },
} as const;

export const sizes = {
  touchMin: 48, // minimum touch target
  buttonPrimary: 60, // main bottom CTA height
  buttonSecondary: 50,
  input: 56,
  tabBar: 76,
  avatarSm: 36,
  avatarMd: 52,
  avatarLg: 112,
  categoryTile: 64,
} as const;

export const shadow = {
  card: {
    shadowColor: '#15201E',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;

export const theme = { colors, categoryColors, spacing, radius, typography, sizes, shadow };
export type Theme = typeof theme;
