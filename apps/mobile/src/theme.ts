// Design tokens. Big, high-contrast UI that works for older users (CLAUDE.md section 4).
export const colors = {
  background: '#FFFFFF',
  surface: '#F3F6F9',
  text: '#111827',
  textMuted: '#4B5563',
  primary: '#0B6E4F',
  primarySoft: '#E3F2EC',
  onPrimary: '#FFFFFF',
  border: '#D1D5DB',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  warning: '#8A5A00',
  warningSoft: '#FFF4D6',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const fontSize = { small: 16, body: 18, title: 28, subtitle: 22, button: 18 } as const;

/** Minimum touch target size in dp. */
export const MIN_TOUCH = 48;
