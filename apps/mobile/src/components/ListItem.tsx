import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme';
import { AppText } from './AppText';

interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Small label on the right, e.g. "Available". */
  badge?: string;
  selected?: boolean;
  onPress?: () => void;
}

/** A big tappable white row with an arrow. */
export function ListItem({ title, subtitle, badge, selected, onPress }: ListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, subtitle, badge].filter(Boolean).join('. ')}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={styles.texts}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="tiny" color="primary">
            {badge}
          </AppText>
        </View>
      ) : null}
      {onPress ? <ChevronRight size={22} color={colors.textMuted} strokeWidth={2} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  selected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { backgroundColor: colors.primarySoft },
  texts: { flex: 1, gap: 2 },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
});
