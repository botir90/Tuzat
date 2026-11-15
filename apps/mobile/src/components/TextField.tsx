import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { MIN_TOUCH, colors, fontSize, spacing } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  /** Fixed text before the input, e.g. "+998". */
  prefix?: string;
}

/** A labelled text input with a big touch area and an error line. */
export function TextField({ label, error, prefix, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, error ? styles.boxError : null]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          {...inputProps}
        />
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { fontSize: fontSize.small, color: colors.text, fontWeight: '600' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH + 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  boxError: { borderColor: colors.danger },
  prefix: { fontSize: fontSize.body, color: colors.text, marginRight: spacing.sm },
  input: { flex: 1, fontSize: fontSize.body, color: colors.text, paddingVertical: spacing.sm },
  error: { fontSize: fontSize.small, color: colors.danger },
});
