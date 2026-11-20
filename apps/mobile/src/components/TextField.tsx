import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius, sizes, spacing } from '@/theme';
import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  /** Fixed text before the input, e.g. "+998". */
  prefix?: string;
}

/** A labelled text input (height 56, radius 14) with an error line. */
export function TextField({ label, error, prefix, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.box, error ? styles.boxError : null]}>
        {prefix ? (
          <AppText variant="bodyStrong" style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          {...inputProps}
        />
      </View>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  boxError: { borderColor: colors.danger },
  prefix: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: spacing.md,
  },
});
