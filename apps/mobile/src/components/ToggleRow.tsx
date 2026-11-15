import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { MIN_TOUCH, colors, fontSize, spacing } from '@/theme';

interface ToggleRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** A big on/off row. The whole row is tappable, not only the small switch. */
export function ToggleRow({ label, hint, value, onChange, disabled }: ToggleRowProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value, disabled }}
      style={[styles.row, value ? styles.on : styles.off]}
    >
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.background}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
  },
  on: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  off: { borderColor: colors.border, backgroundColor: colors.surface },
  texts: { flex: 1, gap: 2 },
  label: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  hint: { fontSize: fontSize.small, color: colors.textMuted },
});
