import { Camera, Clock, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import { formatSum, type FeedItemDto } from '@usta/shared';
import { useLocalized } from '@/i18n/useLocalized';
import { describeDesiredTime } from '@/requests/describe';
import { relativeTime } from '@/requests/relativeTime';
import { colors, fonts, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { PrimaryButton, SecondaryButton } from './buttons';
import { Card } from './Card';
import { VoicePlayer } from './VoicePlayer';

interface FeedCardProps {
  item: FeedItemDto;
  onOpen: () => void;
}

/** One new request in the master's feed (design/screens/MasterFeed.html). */
export function FeedCard({ item, onOpen }: FeedCardProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const ago = relativeTime(item.createdAt);
  const firstPhoto = item.photoUrls[0];

  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.tag}>
          <AppText variant="caption" color="primary" style={styles.bold}>
            {localized(item.category.name)}
          </AppText>
        </View>
        <AppText variant="caption" color="textMuted">
          {t(ago.key, { count: ago.count })}
        </AppText>
      </View>

      {item.description ? (
        <AppText variant="bodyStrong" style={styles.text} numberOfLines={3}>
          {item.description}
        </AppText>
      ) : null}

      {item.voiceUrl || firstPhoto ? (
        <View style={styles.media}>
          {item.voiceUrl ? (
            <View style={styles.flex}>
              <VoicePlayer uri={item.voiceUrl} />
            </View>
          ) : null}
          {firstPhoto ? (
            <View>
              <Image
                source={{ uri: firstPhoto }}
                style={styles.photo}
                accessibilityLabel={t('photos.number', { number: 1 })}
              />
              {item.photoUrls.length > 1 ? (
                <View style={styles.more}>
                  <Camera size={12} color={colors.onPrimary} strokeWidth={2.4} />
                  <AppText variant="tiny" color="onPrimary">
                    {item.photoUrls.length}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <MapPin size={16} color={colors.textSecondary} strokeWidth={2} />
          <AppText variant="caption" color="textSecondary">
            {localized(item.district.name)}
          </AppText>
        </View>
        <View style={styles.metaItem}>
          <Clock size={16} color={colors.textSecondary} strokeWidth={2} />
          <AppText variant="caption" color="textSecondary">
            {describeDesiredTime(t, item)}
          </AppText>
        </View>
      </View>
      {item.priceRange ? (
        <AppText variant="caption" color="textSecondary">
          {t('request.usualPrice', {
            min: formatSum(item.priceRange.min),
            max: formatSum(item.priceRange.max),
          })}
        </AppText>
      ) : null}

      {item.myOffer && item.myOffer.status !== 'WITHDRAWN' ? (
        <SecondaryButton
          label={t('master.offerSentButton', {
            price: formatSum(item.myOffer.price),
            status: t(`offerStatus.${item.myOffer.status}`),
          })}
          onPress={onOpen}
        />
      ) : (
        <View style={styles.cta}>
          <PrimaryButton label={t('master.sendOffer')} onPress={onOpen} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bold: { fontFamily: fonts.bold },
  text: { fontFamily: fonts.semibold, lineHeight: 22 },
  media: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  photo: { width: 60, height: 60, borderRadius: 10, backgroundColor: colors.primaryMuted },
  more: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(21,32,30,0.65)',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  // The card's button is a bit lower than the screen's main button (50 in the mockup).
  cta: { marginTop: spacing.xs },
});
