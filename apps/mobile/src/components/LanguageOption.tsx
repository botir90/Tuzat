import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radius, spacing } from '@/theme';
import { AppText } from './AppText';

interface LanguageOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** One language row (design/screens/Main.html): height 64, check mark when selected. */
export function LanguageOption({ label, selected, onPress }: LanguageOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.selected : styles.idle,
        pressed && !selected && styles.pressed,
      ]}
    >
      <AppText variant="h3" style={styles.label}>
        {label}
      </AppText>
      {selected ? <Check size={24} color={colors.primary} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 64,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idle: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { backgroundColor: colors.primarySoft },
  // The mockup uses weight 600 for language names (h3 is 800).
  label: { fontFamily: fonts.semibold },
});
