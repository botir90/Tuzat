import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme';
import { AppText } from './AppText';

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

/**
 * General-purpose button in the design style (see design/DESIGN.md).
 * New screens should prefer PrimaryButton / SecondaryButton from ./buttons.
 */
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
        pressed && (isPrimary ? styles.primaryPressed : styles.outlinePressed),
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <View style={styles.texts}>
          <AppText
            variant={isPrimary ? 'button' : 'bodyStrong'}
            color={isPrimary ? 'onPrimary' : variant === 'danger' ? 'danger' : 'text'}
            align="center"
          >
            {label}
          </AppText>
          {hint ? (
            <AppText variant="caption" color="textSecondary" align="center">
              {hint}
            </AppText>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.buttonPrimary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryDark },
  outline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  outlinePressed: { backgroundColor: colors.primarySoft },
  danger: { borderColor: colors.danger },
  selected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  inactive: { opacity: 0.5 },
  texts: { alignItems: 'center', gap: spacing.xs },
});
