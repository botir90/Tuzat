import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH, colors, fontSize, spacing } from '@/theme';

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

/** A row of big selectable buttons (choose one). */
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
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primary },
  pressed: { opacity: 0.7 },
  text: { fontSize: fontSize.small, color: colors.text, fontWeight: '600' },
  textSelected: { color: colors.onPrimary },
});
