import { Pressable, StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  /** Optional "See all" link on the right. */
  actionLabel?: string;
  onAction?: () => void;
}

/** Section title (20/800) with an optional link on the right. */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="h2" accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={12}>
          <AppText variant="label" color="primary" style={styles.link}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { fontSize: 14, paddingVertical: spacing.xs },
});
