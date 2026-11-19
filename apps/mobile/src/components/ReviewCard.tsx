import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { ReviewDto } from '@usta/shared';
import { useLocalized } from '@/i18n/useLocalized';
import { formatDateTime } from '@/requests/schedule';
import { colors, fontSize, spacing } from '@/theme';
import { StarRating } from './StarRating';

export function ReviewCard({ review }: { review: ReviewDto }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  return (
    <View style={styles.card}>
      <StarRating value={review.stars} size={22} />
      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
      {review.photoUrls.length > 0 ? (
        <View style={styles.photos}>
          {review.photoUrls.map((url, index) => (
            <Image
              key={url}
              source={{ uri: url }}
              style={styles.photo}
              accessibilityLabel={t('photos.number', { number: index + 1 })}
            />
          ))}
        </View>
      ) : null}
      <Text style={styles.meta}>
        {review.customerName ?? t('review.anonymous')} · {localized(review.categoryName)} ·{' '}
        {formatDateTime(review.createdAt).split(' ')[0]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  comment: { fontSize: fontSize.body, color: colors.text, lineHeight: 26 },
  photos: { flexDirection: 'row', gap: spacing.sm },
  photo: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.surface },
  meta: { fontSize: 14, color: colors.textMuted },
});
