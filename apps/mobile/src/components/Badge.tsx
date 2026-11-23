import { StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { AppText } from './AppText';

const TONES = {
  gold: { bg: colors.goldSoft, fg: colors.goldText },
  teal: { bg: colors.primarySoft, fg: colors.primaryDark },
  blue: { bg: colors.infoSoft, fg: colors.infoText },
} as const;

/** Small rounded label (design: Badge): TOP (gold), verified (teal), on time (blue). */
export function Badge({ label, tone = 'teal' }: { label: string; tone?: keyof typeof TONES }) {
  const c = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <AppText variant="tiny" style={[styles.text, { color: c.fg }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: fonts.bold },
});
