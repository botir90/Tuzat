import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme';
import { AppText } from './AppText';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Optional icon shown before the label. */
  icon?: ReactNode;
  accessibilityHint?: string;
}

/** Main bottom action: height 60, radius 16, teal background, white 18/700 text. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  accessibilityHint,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles.primary,
        pressed && styles.primaryPressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText variant="button" color="onPrimary">
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

interface SecondaryButtonProps extends ButtonProps {
  /** `teal` = teal outline (default), `warm` = neutral outline, `danger` = red outline. */
  tone?: 'teal' | 'warm' | 'danger';
  /** Taller variant (60) when it stands next to a PrimaryButton. */
  tall?: boolean;
}

/** Secondary action: height 50 (or 60), outlined. */
export function SecondaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  accessibilityHint,
  tone = 'teal',
  tall,
}: SecondaryButtonProps) {
  const inactive = disabled || loading;
  const textColor = tone === 'teal' ? 'primary' : tone === 'danger' ? 'danger' : 'text';
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        tall ? styles.tall : styles.secondary,
        tone === 'teal' && styles.outlineTeal,
        tone === 'warm' && styles.outlineWarm,
        tone === 'danger' && styles.outlineDanger,
        pressed && styles.secondaryPressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText variant={tall ? 'button' : 'label'} color={textColor}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primary: { minHeight: sizes.buttonPrimary, backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryDark },
  secondary: { minHeight: sizes.buttonSecondary, borderRadius: radius.lg, borderWidth: 1.5 },
  tall: { minHeight: sizes.buttonPrimary, borderWidth: 1.5 },
  outlineTeal: { borderColor: colors.primary, backgroundColor: 'transparent' },
  outlineWarm: { borderColor: colors.border, backgroundColor: colors.surface },
  outlineDanger: { borderColor: colors.danger, backgroundColor: colors.surface },
  secondaryPressed: { backgroundColor: colors.primarySoft },
  inactive: { opacity: 0.5 },
});
