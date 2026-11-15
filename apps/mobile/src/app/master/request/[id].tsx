import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { MAX_OFFER_MESSAGE_LENGTH, formatSum } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useMasterRequest, useSendOffer, useWithdrawOffer } from '@/api/master';
import { BigButton } from '@/components/BigButton';
import { Chips } from '@/components/Chips';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { VoicePlayer } from '@/components/VoicePlayer';
import { useLocalized } from '@/i18n/useLocalized';
import { describeDesiredTime } from '@/requests/describe';
import { formatDateTime } from '@/requests/schedule';
import { colors, fontSize, spacing } from '@/theme';

/** Arrival options in minutes from now. */
const ARRIVAL_MINUTES = ['30', '60', '120', '240'] as const;

/** A request as the master sees it, with the one-screen offer form. */
export default function MasterRequestScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useMasterRequest(id);
  const send = useSendOffer(id);
  const withdraw = useWithdrawOffer();
  const data = request.data;

  // null = the master hasn't typed anything yet → show the price list's lower end.
  const [typedPrice, setPrice] = useState<string | null>(null);
  const price = typedPrice ?? (data?.priceRange ? String(data.priceRange.min) : '');
  const [arrival, setArrival] = useState<string>('60');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!data) {
    return (
      <Screen title={t('master.requestTitle')}>
        <QueryState
          isLoading={request.isLoading}
          error={request.error}
          onRetry={() => void request.refetch()}
        />
      </Screen>
    );
  }

  const scheduled = data.desiredTime === 'SCHEDULED' && data.scheduledAt;
  const arrivalOptions = [
    ...(scheduled ? [{ value: 'scheduled', label: formatDateTime(data.scheduledAt ?? '') }] : []),
    ...ARRIVAL_MINUTES.map((m) => ({ value: m, label: t(`master.arriveIn${m}`) })),
  ];

  function submit() {
    const amount = Number(price.replace(/\D/g, ''));
    if (!Number.isFinite(amount) || amount < 1000) {
      setFormError(t('master.priceRequired'));
      return;
    }
    setFormError(null);
    const arrivalAt =
      arrival === 'scheduled' && data?.scheduledAt
        ? data.scheduledAt
        : new Date(Date.now() + Number(arrival) * 60_000).toISOString();
    send.mutate({ price: amount, arrivalAt, message: message.trim() || undefined });
  }

  const offer = data.myOffer;
  const canSend = !offer || offer.status === 'WITHDRAWN';

  return (
    <Screen
      title={`${localized(data.category.name)} · ${localized(data.district.name)}`}
      footer={
        <>
          {formError ? <Notice tone="error" text={formError} /> : null}
          {send.isError ? <Notice tone="error" text={errorMessage(t, send.error)} /> : null}
          {withdraw.isError ? <Notice tone="error" text={errorMessage(t, withdraw.error)} /> : null}
          {canSend && data.status === 'OPEN' ? (
            <BigButton label={t('master.sendOffer')} loading={send.isPending} onPress={submit} />
          ) : null}
          {offer?.status === 'SENT' ? (
            <BigButton
              label={t('master.withdraw')}
              variant="danger"
              loading={withdraw.isPending}
              onPress={() => withdraw.mutate(offer.id)}
            />
          ) : null}
          <BigButton
            label={t('common.back')}
            variant="outline"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/master'))}
          />
        </>
      }
    >
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

      <Text style={styles.label}>{t('request.when')}</Text>
      <Text style={styles.body}>{describeDesiredTime(t, data)}</Text>
      {data.priceRange ? (
        <>
          <Text style={styles.label}>{t('master.usualPrice')}</Text>
          <Text style={styles.body}>
            {t('catalog.priceRange', {
              min: formatSum(data.priceRange.min),
              max: formatSum(data.priceRange.max),
            })}
          </Text>
        </>
      ) : null}
      <Notice
        text={data.address ? `${data.address}\n${data.landmark ?? ''}` : t('master.addressHidden')}
      />

      {offer && offer.status !== 'WITHDRAWN' ? (
        <Notice
          tone={offer.status === 'REJECTED' ? 'warning' : 'info'}
          text={t('master.yourOffer', {
            price: formatSum(offer.price),
            time: formatDateTime(offer.arrivalAt),
            status: t(`offerStatus.${offer.status}`),
          })}
        />
      ) : null}

      {canSend && data.status === 'OPEN' ? (
        <>
          <Text style={styles.section}>{t('master.offerTitle')}</Text>
          <TextField
            label={t('master.priceLabel')}
            value={price}
            onChangeText={(text) => setPrice(text.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="120000"
          />
          <Text style={styles.label}>{t('master.arrivalLabel')}</Text>
          <Chips
            label={t('master.arrivalLabel')}
            options={arrivalOptions}
            value={arrival}
            onChange={setArrival}
          />
          <TextField
            label={t('master.messageLabel')}
            value={message}
            onChangeText={setMessage}
            placeholder={t('master.messagePlaceholder')}
            maxLength={MAX_OFFER_MESSAGE_LENGTH}
            multiline
          />
        </>
      ) : null}
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
