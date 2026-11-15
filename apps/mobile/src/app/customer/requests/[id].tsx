import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { errorMessage } from '@/api/errors';
import { useCancelRequest, useRequest } from '@/api/requests';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
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
  label: { fontSize: fontSize.small, fontWeight: '700', color: colors.textMuted },
  body: { fontSize: fontSize.body, color: colors.text, lineHeight: 26 },
  photos: { gap: spacing.sm },
  photo: { width: 160, height: 160, borderRadius: 8, backgroundColor: colors.surface },
});
