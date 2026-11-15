import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH, colors, fontSize, spacing } from '@/theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Small label on the right, e.g. "Available". */
  badge?: string;
  selected?: boolean;
  onPress?: () => void;
}

/** A big tappable row with an arrow. */
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
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={28} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.surface },
  pressed: { opacity: 0.7 },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.body, color: colors.text, fontWeight: '600' },
  subtitle: { fontSize: fontSize.small, color: colors.textMuted },
  badge: {
    fontSize: 14,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
