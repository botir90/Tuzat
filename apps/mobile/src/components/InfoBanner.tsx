import { AlertTriangle, Gift, Info, ShieldCheck, XCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export type BannerVariant = 'safe' | 'promo' | 'urgent' | 'info' | 'error';

const VARIANTS: Record<
  BannerVariant,
  { bg: string; fg: string; text: 'text' | 'goldText' | 'urgentText' | 'danger'; Icon: typeof Info }
> = {
  safe: { bg: colors.primarySoft, fg: colors.primary, text: 'text', Icon: ShieldCheck },
  promo: { bg: colors.goldSoft, fg: colors.goldText, text: 'goldText', Icon: Gift },
  urgent: { bg: colors.urgentSoft, fg: colors.urgent, text: 'urgentText', Icon: AlertTriangle },
  info: { bg: colors.infoSoft, fg: colors.infoText, text: 'text', Icon: Info },
  error: { bg: colors.dangerSoft, fg: colors.danger, text: 'text', Icon: XCircle },
};

interface InfoBannerProps {
  variant?: BannerVariant;
  title?: string;
  text: string;
}

/** Icon + title + text on a soft colored background. */
export function InfoBanner({ variant = 'info', title, text }: InfoBannerProps) {
  const v = VARIANTS[variant];
  return (
    <View
      style={[styles.box, { backgroundColor: v.bg }]}
      accessibilityRole={variant === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <v.Icon size={22} color={v.fg} strokeWidth={2} />
      <View style={styles.texts}>
        {title ? (
          <AppText variant="label" color={v.text}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="body" color={v.text}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xxl,
    alignItems: 'flex-start',
  },
  texts: { flex: 1, gap: 2 },
});
