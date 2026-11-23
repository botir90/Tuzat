import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import type { ReviewDto } from '@usta/shared';
import { useLocalized } from '@/i18n/useLocalized';
import { relativeTime } from '@/requests/relativeTime';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { StarRating } from './StarRating';

/** One review (design/screens/MasterProfile.html): name + time, stars, text, photos. */
export function ReviewCard({ review }: { review: ReviewDto }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const ago = relativeTime(review.createdAt);
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <AppText variant="label">{review.customerName ?? t('review.anonymous')}</AppText>
        <AppText variant="caption" color="textMuted">
          {t(ago.key, { count: ago.count })}
        </AppText>
      </View>
      <StarRating value={review.stars} size={18} />
      {review.comment ? <AppText>{review.comment}</AppText> : null}
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
      <AppText variant="caption" color="textMuted">
        {localized(review.categoryName)}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  photos: { flexDirection: 'row', gap: spacing.sm },
  photo: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.primaryMuted },
});
