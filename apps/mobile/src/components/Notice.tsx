import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/theme';

interface NoticeProps {
  text: string;
  tone?: 'info' | 'error' | 'warning';
}

/** A colored box with a short message (errors, hints, statuses). */
export function Notice({ text, tone = 'info' }: NoticeProps) {
  return (
    <View
      style={[styles.box, styles[tone]]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, padding: spacing.md },
  info: { backgroundColor: colors.primarySoft },
  error: { backgroundColor: colors.dangerSoft },
  warning: { backgroundColor: colors.warningSoft },
  text: { fontSize: fontSize.small, color: colors.text, lineHeight: 24 },
});
