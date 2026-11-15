import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { formatSum, type CustomerOfferDto } from '@usta/shared';
import { formatDateTime } from '@/requests/schedule';
import { colors, fontSize, spacing } from '@/theme';
import { BigButton } from './BigButton';
import { MasterInfo } from './MasterInfo';

interface OfferCardProps {
  offer: CustomerOfferDto;
  onChoose?: () => void;
  choosing?: boolean;
}

/** One master's offer: who, how much, when. */
export function OfferCard({ offer, onChoose, choosing }: OfferCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <MasterInfo master={offer.master} />
      <Text style={styles.price}>{t('offers.price', { price: formatSum(offer.price) })}</Text>
      <Text style={styles.meta}>
        {t('offers.arrival', { time: formatDateTime(offer.arrivalAt) })}
      </Text>
      {offer.message ? <Text style={styles.message}>“{offer.message}”</Text> : null}
      {onChoose ? (
        <BigButton label={t('offers.choose')} onPress={onChoose} loading={choosing} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  price: { fontSize: fontSize.subtitle, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.small, color: colors.textMuted },
  message: { fontSize: fontSize.small, color: colors.text, fontStyle: 'italic' },
});
