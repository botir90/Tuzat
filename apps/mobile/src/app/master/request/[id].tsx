import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_OFFER_MESSAGE_LENGTH, formatSum } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useMasterRequest, useSendOffer, useWithdrawOffer } from '@/api/master';
import { AppText } from '@/components/AppText';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { VoicePlayer } from '@/components/VoicePlayer';
import { useLocalized } from '@/i18n/useLocalized';
import { describeDesiredTime } from '@/requests/describe';
import { formatDateTime } from '@/requests/schedule';
import { colors, fonts, radius, spacing } from '@/theme';

/** Quick arrival choices (minutes). "Other" shows the longer ones and the customer's time. */
const QUICK = ['15', '30', '60'] as const;
const MORE = ['120', '240'] as const;

/** Groups digits for reading: 120000 → "120 000". */
const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** A request as the master sees it + the offer form (design/screens/MasterOffer.html). */
export default function MasterRequestScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useMasterRequest(id);
  const send = useSendOffer(id);
  const withdraw = useWithdrawOffer();
  const data = request.data;

  // null = nothing typed yet → start from the lower end of the price list.
  const [typedPrice, setPrice] = useState<string | null>(null);
  const price = typedPrice ?? (data?.priceRange ? String(data.priceRange.min) : '');
  const [arrival, setArrival] = useState<string>('30');
  const [showMore, setShowMore] = useState(false);
  const [message, setMessage] = useState('');
  const [parts, setParts] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/master'));

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <ScreenHeader title={t('master.offerScreenTitle')} onBack={goBack} />
          <QueryState
            isLoading={request.isLoading}
            error={request.error}
            onRetry={() => void request.refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const scheduled = data.desiredTime === 'SCHEDULED' ? data.scheduledAt : null;
  const options: { value: string; label: string }[] = [
    ...QUICK.map((m) => ({ value: m, label: t(`master.eta${m}`) })),
    ...(showMore
      ? [
          ...MORE.map((m) => ({ value: m, label: t(`master.eta${m}`) })),
          ...(scheduled ? [{ value: 'scheduled', label: formatDateTime(scheduled) }] : []),
        ]
      : [{ value: 'more', label: t('master.etaOther') }]),
  ];

  function submit() {
    const amount = Number(price.replace(/\D/g, ''));
    if (!Number.isFinite(amount) || amount < 1000) {
      setFormError(t('master.priceRequired'));
      return;
    }
    setFormError(null);
    const arrivalAt =
      arrival === 'scheduled' && scheduled
        ? scheduled
        : new Date(Date.now() + Number(arrival) * 60_000).toISOString();
    send.mutate(
      {
        price: amount,
        partsPrice: Math.min(Number(parts) || 0, amount),
        arrivalAt,
        message: message.trim() || undefined,
      },
      { onSuccess: goBack },
    );
  }

  const offer = data.myOffer;
  const canSend = (!offer || offer.status === 'WITHDRAWN') && data.status === 'OPEN';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={canSend ? t('master.offerScreenTitle') : localized(data.category.name)}
          onBack={goBack}
        />

        {/* The request */}
        <Card style={styles.requestCard}>
          <AppText variant="caption" color="textMuted">
            {localized(data.category.name)} · {localized(data.district.name)} ·{' '}
            {describeDesiredTime(t, data)}
          </AppText>
          {data.description ? (
            <AppText variant="body" style={styles.semibold}>
              {data.description}
            </AppText>
          ) : null}
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
          {data.address ? (
            <AppText variant="caption" color="textSecondary">
              {[data.address, data.landmark].filter(Boolean).join(' · ')}
            </AppText>
          ) : (
            <AppText variant="caption" color="textMuted">
              {t('master.addressHidden')}
            </AppText>
          )}
        </Card>

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

        {canSend ? (
          <>
            {/* Price */}
            <View style={styles.section}>
              <AppText variant="label">{t('master.priceLabel')}</AppText>
              <View style={styles.priceBox}>
                <TextInput
                  value={groupDigits(price)}
                  onChangeText={(text) => setPrice(text.replace(/\D/g, '').slice(0, 9))}
                  keyboardType="number-pad"
                  accessibilityLabel={t('master.priceLabel')}
                  placeholder="120 000"
                  placeholderTextColor={colors.textMuted}
                  style={styles.priceInput}
                />
                <AppText variant="bodyStrong" color="textSecondary" style={styles.semibold}>
                  {t('common.sum')}
                </AppText>
              </View>
              {data.priceRange ? (
                <AppText variant="caption" color="textSecondary">
                  {t('request.usualPrice', {
                    min: formatSum(data.priceRange.min),
                    max: formatSum(data.priceRange.max),
                  })}
                </AppText>
              ) : null}
            </View>

            {/* Parts inside the price (optional): the customer sees labor and parts apart. */}
            <TextField
              label={t('master.partsLabel')}
              value={parts}
              onChangeText={(text) => setParts(text.replace(/\D/g, '').slice(0, 9))}
              keyboardType="number-pad"
              placeholder={t('master.partsPlaceholder')}
            />

            {/* Arrival */}
            <View style={styles.section}>
              <AppText variant="label">{t('master.arrivalLabel')}</AppText>
              <View style={styles.etaGrid} accessibilityRole="radiogroup">
                {options.map((option) => {
                  const selected = option.value === arrival;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        option.value === 'more' ? setShowMore(true) : setArrival(option.value)
                      }
                      accessibilityRole={option.value === 'more' ? 'button' : 'radio'}
                      accessibilityState={{ selected }}
                      style={[styles.eta, selected && styles.etaSelected]}
                    >
                      <AppText
                        variant="label"
                        color={selected ? 'primary' : 'text'}
                        style={styles.etaText}
                        numberOfLines={1}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TextField
              label={t('master.messageLabel')}
              value={message}
              onChangeText={setMessage}
              placeholder={t('master.messagePlaceholder')}
              maxLength={MAX_OFFER_MESSAGE_LENGTH}
            />
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {formError ? <Notice tone="error" text={formError} /> : null}
        {send.isError ? <Notice tone="error" text={errorMessage(t, send.error)} /> : null}
        {withdraw.isError ? <Notice tone="error" text={errorMessage(t, withdraw.error)} /> : null}
        {canSend ? (
          <>
            <PrimaryButton
              label={t('master.sendOffer')}
              loading={send.isPending}
              onPress={submit}
            />
            <AppText variant="caption" color="textSecondary" align="center">
              {t('master.offerFreeNote')}
            </AppText>
          </>
        ) : null}
        {offer?.status === 'SENT' ? (
          <SecondaryButton
            tone="danger"
            label={t('master.withdraw')}
            loading={withdraw.isPending}
            onPress={() => withdraw.mutate(offer.id)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xl },
  requestCard: { gap: spacing.sm, paddingVertical: 14 },
  semibold: { fontFamily: fonts.semibold },
  photos: { gap: spacing.sm },
  photo: { width: 120, height: 120, borderRadius: radius.md, backgroundColor: colors.primaryMuted },
  section: { gap: 10 },
  priceBox: {
    height: 64,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceInput: {
    flex: 1,
    fontSize: 26,
    fontFamily: fonts.extrabold,
    color: colors.text,
    paddingVertical: 0,
  },
  etaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  eta: {
    flexBasis: '22%',
    flexGrow: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  etaSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  etaText: { fontSize: 14 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 28,
    gap: 10,
    backgroundColor: colors.bg,
  },
});
