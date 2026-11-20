import { Pressable, StyleSheet } from 'react-native';
import type { CategoryColor, CategoryIcon as IconName } from '@usta/shared';
import { spacing } from '@/theme';
import { AppText } from './AppText';
import { CategoryIcon } from './CategoryIcon';

interface CategoryTileProps {
  label: string;
  icon: IconName;
  color: CategoryColor;
  onPress: () => void;
  /** 64 on the home screen, 56 on "All services". */
  size?: number;
}

/** Icon square + label below (design: CategoryTile). Four per row. */
export function CategoryTile({ label, icon, color, onPress, size = 64 }: CategoryTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <CategoryIcon icon={icon} color={color} size={size} />
      <AppText variant="tiny" align="center" numberOfLines={2} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: '25%', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  pressed: { opacity: 0.6 },
  label: { lineHeight: 15, paddingHorizontal: 2 },
});
