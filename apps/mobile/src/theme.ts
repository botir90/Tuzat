/**
 * Design tokens. Source of truth: design/theme.ts and design/DESIGN.md.
 * Keep the values identical to design/theme.ts; only the app-specific extras below differ.
 */
import type { TextStyle } from 'react-native';

export const colors = {
  // Brand
  primary: '#0F6B5C',
  primaryDark: '#0A4F44',
  primarySoft: '#E3F1EE',
  primaryMuted: '#CFE3DE',

  // Accents (use sparingly)
  gold: '#F2B544',
  goldSoft: '#FFF6DE',
  goldText: '#5A4210',
  indigo: '#2D2A6E',
  indigoText: '#D6D4F5',
  urgent: '#C2410C',
  urgentSoft: '#FFF1EA',
  urgentText: '#7A2A08',
  danger: '#D92D20',
  telegram: '#229ED9',
  star: '#C77700',
  starFill: '#F2B544',

  // Neutrals
  bg: '#F6F7F4',
  surface: '#FFFFFF',
  text: '#15201E',
  textSecondary: '#4F5B59',
  textMuted: '#5B6866',
  border: '#D5DBD9',
  divider: '#E3E7E5',
  placeholderBorder: '#9AA6A3',

  // Call screen (dark)
  callBg: '#0E2B26',
  callRing: '#7FD4C1',

  // App extras (not in the design file): text on teal, error and info backgrounds.
  onPrimary: '#FFFFFF',
  dangerSoft: '#FDECEA',
  infoSoft: '#E8F0FB',
  infoText: '#1F4E8C',

  // Legacy names used by screens that are not rebuilt from the design yet.
  background: '#F6F7F4',
  warningSoft: '#FFF1EA',
} as const;

/** Category tile colors (background + icon) from design/theme.ts, by color name (CATEGORY_COLORS). */
export const categoryPalette = {
  blue: { bg: '#E4EEFB', fg: '#1F5FAE' },
  gold: { bg: '#FFF3D6', fg: '#9A6400' },
  cyan: { bg: '#E0F4F8', fg: '#0B6E85' },
  violet: { bg: '#EEE8FA', fg: '#6B3FA0' },
  teal: { bg: '#E3F1EE', fg: '#0F6B5C' },
  orange: { bg: '#FDECE2', fg: '#B4471A' },
  pink: { bg: '#FBE7EF', fg: '#A3305E' },
  gray: { bg: '#ECEFEE', fg: '#3E4B49' },
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
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 18,
  xxxl: 20,
  hero: 24,
  pill: 999,
} as const;

/**
 * Inter font files, one per weight. On Android a custom font ignores `fontWeight`,
 * so every text style names the exact font file instead.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const typography = {
  display: { fontSize: 28, fontFamily: fonts.extrabold, letterSpacing: -0.4 },
  h1: { fontSize: 24, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontFamily: fonts.extrabold },
  h3: { fontSize: 18, fontFamily: fonts.extrabold },
  bodyStrong: { fontSize: 16, fontFamily: fonts.bold },
  body: { fontSize: 15, fontFamily: fonts.regular, lineHeight: 22 },
  label: { fontSize: 15, fontFamily: fonts.bold },
  caption: { fontSize: 13, fontFamily: fonts.regular },
  tiny: { fontSize: 12, fontFamily: fonts.semibold },
  button: { fontSize: 18, fontFamily: fonts.bold },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const sizes = {
  touchMin: 48,
  buttonPrimary: 60,
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

/** Minimum touch target size in dp. */
export const MIN_TOUCH = sizes.touchMin;

/** Legacy font sizes used by screens that are not rebuilt from the design yet. */
export const fontSize = { small: 15, body: 16, title: 24, subtitle: 20, button: 18 } as const;
