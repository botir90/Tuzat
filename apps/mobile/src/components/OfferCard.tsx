import { Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatSum, type CustomerOfferDto } from '@usta/shared';
import { arrivalText } from '@/jobs/arrival';
import { colors, fonts, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { PrimaryButton, SecondaryButton } from './buttons';
import { Card } from './Card';

interface OfferCardProps {
  offer: CustomerOfferDto;
  onChoose: () => void;
  choosing?: boolean;
  disabled?: boolean;
  /** Opens the master's page with reviews and work samples. */
  onViewMaster: () => void;
  /** The first (best) offer gets the filled button, the rest an outline. */
  highlighted?: boolean;
}

/** One master's offer (design/screens/Offers.html): who, price, arrival, choose. */
export function OfferCard({
  offer,
  onChoose,
  choosing,
  disabled,
  onViewMaster,
  highlighted,
}: OfferCardProps) {
  const { t } = useTranslation();
  const { master } = offer;
  const name = master.name ?? t('offers.master');
  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onViewMaster}
        accessibilityRole="link"
        accessibilityLabel={t('offers.viewMasterNamed', { name })}
        style={styles.who}
      >
        <Avatar
          id={master.id}
          name={master.name}
          photoUrl={master.photoUrl}
          verified={master.verified}
        />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color="primary" style={styles.name}>
            {name}
          </AppText>
          <View style={styles.rating}>
            <Star size={14} color={colors.star} fill={colors.starFill} strokeWidth={2} />
            <AppText variant="caption" style={styles.bold}>
              {master.ratingCount > 0 ? master.ratingAvg.toFixed(1) : t('offers.new')}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              ·{' '}
              {t('offers.stats', { jobs: master.completedJobsCount, reviews: master.ratingCount })}
            </AppText>
          </View>
        </View>
      </Pressable>

      <View style={styles.boxes}>
        <View style={styles.box}>
          <AppText variant="caption" color="textSecondary">
            {t('offers.priceLabel')}
          </AppText>
          <AppText variant="h3">
            {formatSum(offer.price)} {t('common.sum')}
          </AppText>
        </View>
        <View style={styles.box}>
          <AppText variant="caption" color="textSecondary">
            {t('offers.arrivesLabel')}
          </AppText>
          <AppText variant="h3">{arrivalText(t, offer.arrivalAt)}</AppText>
        </View>
      </View>

      {offer.message ? (
        <AppText variant="caption" color="textSecondary">
          “{offer.message}”
        </AppText>
      ) : null}

      {highlighted ? (
        <PrimaryButton
          label={t('offers.choose')}
          onPress={onChoose}
          loading={choosing}
          disabled={disabled}
        />
      ) : (
        <SecondaryButton
          tall
          label={t('offers.choose')}
          onPress={onChoose}
          loading={choosing}
          disabled={disabled}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  flex: { flex: 1, gap: 2 },
  name: { textDecorationLine: 'underline' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  bold: { fontFamily: fonts.bold },
  boxes: { flexDirection: 'row', gap: 10 },
  box: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
});
