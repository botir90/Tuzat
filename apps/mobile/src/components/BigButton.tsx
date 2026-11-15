import { Pressable, StyleSheet, Text } from 'react-native';
import { MIN_TOUCH, colors, fontSize, spacing } from '@/theme';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  selected?: boolean;
  accessibilityHint?: string;
}

/** A large, accessible button used across the app. */
export function BigButton({
  label,
  onPress,
  variant = 'primary',
  selected = false,
  accessibilityHint,
}: BigButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelOutline]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH + 8,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  outline: { backgroundColor: colors.background, borderColor: colors.border },
  selected: { borderColor: colors.primary, backgroundColor: colors.surface },
  pressed: { opacity: 0.7 },
  label: { fontSize: fontSize.button, fontWeight: '600' },
  labelPrimary: { color: colors.onPrimary },
  labelOutline: { color: colors.text },
});
