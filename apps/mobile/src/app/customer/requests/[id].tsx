import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { errorMessage } from '@/api/errors';
import { useAcceptOffer, useOffers } from '@/api/jobs';
import { useCancelRequest, useRequest } from '@/api/requests';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { OfferCard } from '@/components/OfferCard';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { VoicePlayer } from '@/components/VoicePlayer';
import { useLocalized } from '@/i18n/useLocalized';
import { formatDateTime } from '@/requests/schedule';
import { REQUEST_STATUS_TONE } from '@/requests/status';
import { colors, fontSize, spacing } from '@/theme';

export default function RequestDetailScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useRequest(id);
  const cancel = useCancelRequest(id);
  const data = request.data;
  const offers = useOffers(id, data?.status === 'OPEN');
  const acceptOffer = useAcceptOffer(id);

  if (!data) {
    return (
      <Screen title={t('requests.detailTitle')}>
        <QueryState
          isLoading={request.isLoading}
          error={request.error}
          onRetry={() => void request.refetch()}
        />
      </Screen>
    );
  }

  const when =
    data.desiredTime === 'SCHEDULED' && data.scheduledAt
      ? formatDateTime(data.scheduledAt)
      : t(data.desiredTime === 'NOW' ? 'request.timeNow' : 'request.timeToday');

  return (
    <Screen
      title={localized(data.category.name)}
      footer={
        <>
          {cancel.isError ? <Notice tone="error" text={errorMessage(t, cancel.error)} /> : null}
          {data.jobId ? (
            <BigButton
              label={t('jobs.open')}
              onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: data.jobId! } })}
            />
          ) : null}
          {data.status === 'OPEN' ? (
            <BigButton
              label={t('requests.cancel')}
              variant="danger"
              loading={cancel.isPending}
              onPress={() => cancel.mutate()}
            />
          ) : null}
          <BigButton
            label={t('common.back')}
            variant="outline"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </>
      }
    >
      <Notice
        tone={REQUEST_STATUS_TONE[data.status]}
        text={`${t(`requestStatus.${data.status}`)}. ${t(`requestStatusHint.${data.status}`)}`}
      />

      {/* Offers: the customer compares and chooses a master. */}
      {data.status === 'OPEN' ? (
        <>
          <Text style={styles.section}>{t('offers.title')}</Text>
          <QueryState
            isLoading={offers.isLoading}
            error={offers.error}
            onRetry={() => void offers.refetch()}
          />
          {offers.data?.length === 0 ? <Notice text={t('offers.waiting')} /> : null}
          {acceptOffer.isError ? (
            <Notice tone="error" text={errorMessage(t, acceptOffer.error)} />
          ) : null}
          {offers.data?.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onViewMaster={() =>
                router.push({ pathname: '/masters/[id]', params: { id: offer.master.id } })
              }
              choosing={acceptOffer.isPending && acceptOffer.variables === offer.id}
              onChoose={() =>
                acceptOffer.mutate(offer.id, {
                  onSuccess: (job) =>
                    router.replace({ pathname: '/jobs/[id]', params: { id: job.id } }),
                })
              }
            />
          ))}
        </>
      ) : null}

      {data.description ? <Text style={styles.body}>{data.description}</Text> : null}
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

      <Text style={styles.label}>{t('request.where')}</Text>
      <Text style={styles.body}>
        {localized(data.district.name)}, {localized(data.region.name)}
        {data.address ? `\n${data.address}` : ''}
        {data.landmark ? `\n${data.landmark}` : ''}
      </Text>

      <Text style={styles.label}>{t('request.when')}</Text>
      <Text style={styles.body}>{when}</Text>

      <Text style={styles.label}>{t('requests.createdAt')}</Text>
      <Text style={styles.body}>{formatDateTime(data.createdAt)}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: fontSize.subtitle, fontWeight: '700', color: colors.text, marginTop: 8 },
  label: { fontSize: fontSize.small, fontWeight: '700', color: colors.textMuted },
  body: { fontSize: fontSize.body, color: colors.text, lineHeight: 26 },
  photos: { gap: spacing.sm },
  photo: { width: 160, height: 160, borderRadius: 8, backgroundColor: colors.surface },
});
