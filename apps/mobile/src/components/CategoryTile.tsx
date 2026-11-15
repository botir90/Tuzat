import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, spacing } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface CategoryTileProps {
  label: string;
  icon: string;
  onPress: () => void;
}

/** Big square tile with an icon and a label (customer home). */
export function CategoryTile({ label, icon, onPress }: CategoryTileProps) {
  // Icon names come from the server; fall back to a generic one if unknown.
  const name: IconName = icon in MaterialCommunityIcons.glyphMap ? (icon as IconName) : 'tools';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={name} size={40} color={colors.primary} />
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 120,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  label: { fontSize: fontSize.body, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
