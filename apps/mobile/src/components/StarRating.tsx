import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, colors } from '@/theme';

const STARS = [1, 2, 3, 4, 5] as const;
const GOLD = '#E0A100';

interface StarRatingProps {
  value: number;
  /** Omit to show the stars read-only. */
  onChange?: (stars: number) => void;
  size?: number;
}

/** Five big stars. Each star is a separate 48 dp button for older users. */
export function StarRating({ value, onChange, size = 40 }: StarRatingProps) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.row}
      accessibilityRole={onChange ? 'adjustable' : 'image'}
      accessibilityLabel={t('review.starsLabel', { count: value })}
    >
      {STARS.map((star) => {
        const icon = (
          <MaterialCommunityIcons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? GOLD : colors.border}
          />
        );
        return onChange ? (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            accessibilityRole="button"
            accessibilityLabel={t('review.starsLabel', { count: star })}
            style={styles.touch}
          >
            {icon}
          </Pressable>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  touch: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
