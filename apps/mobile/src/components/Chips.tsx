import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme';
import { AppText } from './AppText';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface ChipsProps<T extends string> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}

/** Choose one: selected chip = 2px teal border + teal soft background (design/DESIGN.md). */
export function Chips<T extends string>({ options, value, onChange, label }: ChipsProps<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}
          >
            <AppText variant="label" color={selected ? 'primary' : 'text'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: sizes.touchMin,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  selected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { backgroundColor: colors.primarySoft },
});
