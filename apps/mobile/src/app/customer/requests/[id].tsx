import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '@/api/errors';
import { useAcceptOffer, useOffers } from '@/api/jobs';
import { useCancelRequest, useRequest } from '@/api/requests';
import { AppText } from '@/components/AppText';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { OfferCard } from '@/components/OfferCard';
import { QueryState } from '@/components/QueryState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VoicePlayer } from '@/components/VoicePlayer';
import { useLocalized } from '@/i18n/useLocalized';
import { describeDesiredTime } from '@/requests/describe';
import { REQUEST_STATUS_TONE } from '@/requests/status';
import { colors, radius, spacing } from '@/theme';

/** A request: while OPEN, the offers to choose from (design/screens/Offers.html). */
export default function RequestDetailScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useRequest(id);
  const cancel = useCancelRequest(id);
  const data = request.data;
  const isOpen = data?.status === 'OPEN';
  const offers = useOffers(id, isOpen);
  const acceptOffer = useAcceptOffer(id);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/customer/requests'));

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <ScreenHeader title={t('requests.detailTitle')} onBack={goBack} />
          <QueryState
            isLoading={request.isLoading}
            error={request.error}
            onRetry={() => void request.refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const count = offers.data?.length ?? 0;
  const title =
    isOpen && count > 0 ? t('offers.countTitle', { count }) : localized(data.category.name);
  const subtitle =
    isOpen && count > 0
      ? t('offers.moreMayCome')
      : `${t(`requestStatus.${data.status}`)} · ${localized(data.district.name)}`;

  function choose(offerId: string) {
    acceptOffer.mutate(offerId, {
      onSuccess: (job) => router.replace({ pathname: '/jobs/[id]', params: { id: job.id } }),
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={request.isRefetching || offers.isRefetching}
            onRefresh={() => void Promise.all([request.refetch(), offers.refetch()])}
            colors={[colors.primary]}
          />
        }
      >
        <ScreenHeader title={title} subtitle={subtitle} onBack={goBack} />

        {!isOpen ? (
          <Notice
            tone={REQUEST_STATUS_TONE[data.status]}
            text={t(`requestStatusHint.${data.status}`)}
          />
        ) : null}

        {/* Offers: compare and choose a master. */}
        {isOpen ? (
          <>
            <QueryState
              isLoading={offers.isLoading}
              error={offers.error}
              onRetry={() => void offers.refetch()}
            />
            {offers.data?.length === 0 ? (
              <Notice title={t('offers.waitingTitle')} text={t('offers.waiting')} />
            ) : null}
            {acceptOffer.isError ? (
              <Notice tone="error" text={errorMessage(t, acceptOffer.error)} />
            ) : null}
            {offers.data?.map((offer, index) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                highlighted={index === 0}
                onViewMaster={() =>
                  router.push({
                    pathname: '/masters/[id]',
                    params: { id: offer.master.id, offerId: offer.id, requestId: id },
                  })
                }
                choosing={acceptOffer.isPending && acceptOffer.variables === offer.id}
                disabled={acceptOffer.isPending}
                onChoose={() => choose(offer.id)}
              />
            ))}
          </>
        ) : null}

        {/* What the customer asked for. */}
        <Card style={styles.summary}>
          <AppText variant="caption" color="textMuted">
            {localized(data.category.name)} · {describeDesiredTime(t, data)}
          </AppText>
          {data.description ? <AppText>{data.description}</AppText> : null}
          {data.voiceUrl ? <VoicePlayer uri={data.voiceUrl} /> : null}
          {data.photoUrls.length > 0 ? (
            <ScrollView horizontal contentContainerStyle={styles.photos}>
              {data.photoUrls.map((url, index) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={styles.photo}
                  accessibilityLabel={t('photos.number', { number: index + 1 })}
                />
              ))}
            </ScrollView>
          ) : null}
          <AppText variant="caption" color="textSecondary">
            {[data.address, data.landmark, localized(data.district.name)]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        {cancel.isError ? <Notice tone="error" text={errorMessage(t, cancel.error)} /> : null}
        {data.jobId ? (
          <PrimaryButton
            label={t('jobs.open')}
            onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: data.jobId! } })}
          />
        ) : null}
        {isOpen ? (
          <SecondaryButton
            tone="danger"
            label={t('requests.cancel')}
            loading={cancel.isPending}
            onPress={() => cancel.mutate()}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.md },
  summary: { gap: spacing.sm, marginTop: spacing.sm },
  photos: { gap: spacing.sm },
  photo: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.primaryMuted },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: 10,
  },
});
