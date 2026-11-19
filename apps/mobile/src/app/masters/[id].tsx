import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { useMasterPage } from '@/api/trust';
import { BigButton } from '@/components/BigButton';
import { MasterInfo } from '@/components/MasterInfo';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { ReviewCard } from '@/components/ReviewCard';
import { Screen } from '@/components/Screen';
import { useLocalized } from '@/i18n/useLocalized';
import { colors, fontSize, spacing } from '@/theme';

/** A master's public page: work samples and every review, negative ones too. */
export default function MasterPageScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { id } = useLocalSearchParams<{ id: string }>();
  const page = useMasterPage(id);
  const data = page.data;

  return (
    <Screen
      title={t('masterPage.title')}
      footer={
        <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
      }
    >
      <QueryState
        isLoading={page.isLoading}
        error={page.error}
        onRetry={() => void page.refetch()}
      />
      {data ? (
        <>
          <MasterInfo master={data.master} />
          {data.bio ? <Text style={styles.body}>{data.bio}</Text> : null}
          <Text style={styles.body}>
            {data.categories.map((c) => localized(c.name)).join(', ')}
          </Text>

          {data.workPhotoUrls.length > 0 ? (
            <>
              <Text style={styles.label}>{t('masterPage.workPhotos')}</Text>
              <ScrollView horizontal contentContainerStyle={styles.photos}>
                {data.workPhotoUrls.map((url, index) => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    style={styles.photo}
                    accessibilityLabel={t('photos.number', { number: index + 1 })}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.label}>
            {t('masterPage.reviews', { count: data.master.ratingCount })}
          </Text>
          {data.reviews.length === 0 ? <Notice text={t('masterPage.noReviews')} /> : null}
          {data.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.small, fontWeight: '700', color: colors.textMuted, marginTop: 8 },
  body: { fontSize: fontSize.body, color: colors.text, lineHeight: 26 },
  photos: { gap: spacing.sm },
  photo: { width: 140, height: 140, borderRadius: 8, backgroundColor: colors.surface },
});
