import { Text, type TextProps } from 'react-native';
import { colors, typography, type TypographyVariant } from '@/theme';

type TextColor =
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'primary'
  | 'onPrimary'
  | 'danger'
  | 'goldText'
  | 'urgentText';

interface AppTextProps extends TextProps {
  /** Text style from design/theme.ts (font size, weight, letter spacing). */
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

/**
 * Text in the Inter font. Use this instead of React Native's <Text> on every screen
 * built from the design, so sizes and weights always come from the theme.
 */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        typography[variant],
        { color: colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...props}
    />
  );
}
