import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { MasterCard } from '@usta/shared';
import { colors, fontSize, spacing } from '@/theme';

/** Photo, name, verified badge, rating and number of finished jobs. */
export function MasterInfo({ master }: { master: MasterCard }) {
  const { t } = useTranslation();
  const rating =
    master.ratingCount > 0
      ? t('offers.rating', { rating: master.ratingAvg.toFixed(1), count: master.ratingCount })
      : t('offers.noRating');
  return (
    <View style={styles.row}>
      {master.photoUrl ? (
        <Image
          source={{ uri: master.photoUrl }}
          style={styles.photo}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.photo, styles.placeholder]}>
          <MaterialCommunityIcons name="account" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.texts}>
        <Text style={styles.name}>{master.name ?? t('offers.master')}</Text>
        {master.verified ? <Text style={styles.verified}>✓ {t('offers.verified')}</Text> : null}
        <Text style={styles.meta}>
          {rating} · {t('offers.jobsDone', { count: master.completedJobsCount })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  photo: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  verified: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  meta: { fontSize: 14, color: colors.textMuted },
});
