import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH, colors, fontSize, spacing } from '@/theme';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Smaller second line under the label. */
  hint?: string;
  accessibilityHint?: string;
}

/** A large, accessible button used across the app. */
export function BigButton({
  label,
  onPress,
  variant = 'primary',
  selected = false,
  disabled = false,
  loading = false,
  hint,
  accessibilityHint,
}: BigButtonProps) {
  const isPrimary = variant === 'primary';
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        variant === 'danger' && styles.danger,
        selected && styles.selected,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <View style={styles.texts}>
          <Text
            style={[
              styles.label,
              isPrimary ? styles.labelPrimary : styles.labelOutline,
              variant === 'danger' && styles.labelDanger,
            ]}
          >
            {label}
          </Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      )}
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
  danger: { borderColor: colors.danger },
  selected: { borderColor: colors.primary, backgroundColor: colors.surface },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  texts: { alignItems: 'center', gap: spacing.xs },
  label: { fontSize: fontSize.button, fontWeight: '600', textAlign: 'center' },
  labelPrimary: { color: colors.onPrimary },
  labelOutline: { color: colors.text },
  labelDanger: { color: colors.danger },
  hint: { fontSize: fontSize.small, color: colors.textMuted, textAlign: 'center' },
});
