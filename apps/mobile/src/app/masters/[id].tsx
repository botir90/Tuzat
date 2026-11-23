import { router, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatSum } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useAcceptOffer, useOffers } from '@/api/jobs';
import { useMasterPage } from '@/api/trust';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { PrimaryButton } from '@/components/buttons';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { ReviewCard } from '@/components/ReviewCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLocalized } from '@/i18n/useLocalized';
import { colors, radius, spacing } from '@/theme';

/** Ratings at or above this, with enough reviews, earn the "TOP" badge. */
const TOP_RATING = 4.8;
const TOP_MIN_REVIEWS = 10;

/**
 * A master's public page (design/screens/MasterProfile.html): badges, stats, about,
 * typical prices, work photos and every review. Opened from an offer it can also
 * choose this master.
 */
export default function MasterPageScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { id, offerId, requestId } = useLocalSearchParams<{
    id: string;
    offerId?: string;
    requestId?: string;
  }>();
  const page = useMasterPage(id);
  const offers = useOffers(requestId ?? '', Boolean(requestId && offerId));
  const acceptOffer = useAcceptOffer(requestId ?? '');
  const offer = offers.data?.find((o) => o.id === offerId);
  const data = page.data;

  const header = <ScreenHeader title={t('masterPage.title')} />;
  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {header}
          <QueryState
            isLoading={page.isLoading}
            error={page.error}
            onRetry={() => void page.refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { master } = data;
  const isTop = master.ratingAvg >= TOP_RATING && master.ratingCount >= TOP_MIN_REVIEWS;
  const place = [
    data.categories[0] ? localized(data.categories[0].name) : null,
    data.districts[0] ? localized(data.districts[0]) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {header}

        {/* Who */}
        <View style={styles.hero}>
          <Avatar
            id={master.id}
            name={master.name}
            photoUrl={master.photoUrl}
            size={112}
            verified={master.verified}
          />
          <AppText variant="h1" align="center">
            {master.name ?? t('offers.master')}
          </AppText>
          {place ? (
            <AppText color="textSecondary" align="center">
              {place}
            </AppText>
          ) : null}
          <View style={styles.badges}>
            {isTop ? <Badge tone="gold" label={t('badges.top')} /> : null}
            {master.verified ? <Badge tone="teal" label={t('badges.verified')} /> : null}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <Stat
            value={master.ratingCount > 0 ? master.ratingAvg.toFixed(1) : '—'}
            label={t('masterPage.rating')}
            star
          />
          <Stat value={String(master.completedJobsCount)} label={t('masterPage.jobsDone')} />
          <Stat value={String(master.ratingCount)} label={t('masterPage.reviewsCount')} />
        </View>

        {data.bio ? (
          <View style={styles.section}>
            <AppText variant="h3">{t('masterPage.about')}</AppText>
            <AppText color="textSecondary">{data.bio}</AppText>
          </View>
        ) : null}

        {data.prices.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="h3">{t('masterPage.prices')}</AppText>
            <Card style={styles.priceCard}>
              {data.prices.map((price, index) => (
                <View key={price.id} style={[styles.priceRow, index > 0 && styles.divider]}>
                  <AppText style={styles.flex}>{localized(price.name)}</AppText>
                  <AppText variant="label">
                    {t('home.priceFrom', { price: formatSum(price.minPrice) })}
                  </AppText>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {data.workPhotoUrls.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <AppText variant="h3">{t('masterPage.workPhotos')}</AppText>
              <AppText variant="caption" color="textMuted">
                {t('masterPage.photosCount', { count: data.workPhotoUrls.length })}
              </AppText>
            </View>
            <View style={styles.grid}>
              {data.workPhotoUrls.map((url, index) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={styles.photo}
                  accessibilityLabel={t('photos.number', { number: index + 1 })}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <AppText variant="h3">{t('masterPage.reviewsTitle')}</AppText>
            <AppText variant="caption" color="textMuted">
              {t('masterPage.onlyReal', { count: master.ratingCount })}
            </AppText>
          </View>
          {data.reviews.length === 0 ? <Notice text={t('masterPage.noReviews')} /> : null}
          {data.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </View>
      </ScrollView>

      {offer ? (
        <View style={styles.footer}>
          {acceptOffer.isError ? (
            <Notice tone="error" text={errorMessage(t, acceptOffer.error)} />
          ) : null}
          <PrimaryButton
            label={t('masterPage.chooseFor', { price: formatSum(offer.price) })}
            loading={acceptOffer.isPending}
            onPress={() =>
              acceptOffer.mutate(offer.id, {
                onSuccess: (job) => {
                  router.dismissAll();
                  router.push({ pathname: '/jobs/[id]', params: { id: job.id } });
                },
              })
            }
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Stat({ value, label, star }: { value: string; label: string; star?: boolean }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>
        {star ? (
          <Star size={18} color={colors.star} fill={colors.starFill} strokeWidth={2} />
        ) : null}
        <AppText variant="h2">{value}</AppText>
      </View>
      <AppText variant="caption" color="textSecondary" align="center">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  section: { gap: 10 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  priceCard: { paddingVertical: spacing.xs, gap: 0 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: 10,
  },
});
