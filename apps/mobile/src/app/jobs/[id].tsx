import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, MessageSquare, Phone } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatSum, formatUzPhone, type JobDto } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useAnswerPrice, useCancelJob, useJob, useJobStatus, useProposePrice } from '@/api/jobs';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { Card } from '@/components/Card';
import { Chips } from '@/components/Chips';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { ReviewCard } from '@/components/ReviewCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusTimeline } from '@/components/StatusTimeline';
import { TextField } from '@/components/TextField';
import { useLocalized } from '@/i18n/useLocalized';
import { googleMapsUrl, yandexMapsUrl } from '@/jobs/links';
import { formatDateTime } from '@/requests/schedule';
import { colors, fonts, radius, spacing } from '@/theme';

const ETA_OPTIONS = ['10', '20', '30', '60'] as const;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** One screen for both sides (design/screens/JobStatus.html): now, next, and the actions. */
export default function JobScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);

  if (!job.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <ScreenHeader title={t('jobs.title')} onBack={goBack} />
          <QueryState
            isLoading={job.isLoading}
            error={job.error}
            onRetry={() => void job.refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }
  return (
    <JobView job={job.data} refreshing={job.isRefetching} onRefresh={() => void job.refetch()} />
  );
}

function JobView({
  job,
  refreshing,
  onRefresh,
}: {
  job: JobDto;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const setStatus = useJobStatus(job.id);
  const cancel = useCancelJob(job.id);
  const propose = useProposePrice(job.id);
  const answer = useAnswerPrice(job.id);

  const [eta, setEta] = useState<string>('20');
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isMaster = job.myRole === 'MASTER';
  const active = job.status !== 'DONE' && job.status !== 'CANCELLED';
  const canCancel = job.status === 'ACCEPTED' || job.status === 'ON_THE_WAY';
  const regionName = localized(job.request.region.name);
  const districtName = localized(job.request.district.name);
  const error = setStatus.error ?? cancel.error ?? propose.error ?? answer.error;
  const price = job.finalPrice ?? job.currentPrice;
  const other = isMaster
    ? { id: `c-${job.id}`, name: job.customer.name, photoUrl: null, phone: job.customer.phone }
    : {
        id: job.master.id,
        name: job.master.name,
        photoUrl: job.master.photoUrl,
        phone: job.master.phone,
      };

  function submitPriceChange() {
    const amount = Number(newPrice);
    if (!Number.isFinite(amount) || amount < 1000 || reason.trim().length < 3) {
      setFormError(t('jobs.priceChangeInvalid'));
      return;
    }
    setFormError(null);
    propose.mutate(
      { newPrice: amount, reason: reason.trim() },
      {
        onSuccess: () => {
          setShowPriceForm(false);
          setNewPrice('');
          setReason('');
        },
      },
    );
  }

  // The one main action of this moment, pinned at the bottom.
  let mainAction: { label: string; onPress: () => void; disabled?: boolean } | null = null;
  if (isMaster && job.status === 'ACCEPTED') {
    mainAction = {
      label: t('jobs.onTheWay'),
      onPress: () => setStatus.mutate({ status: 'ON_THE_WAY', etaMinutes: Number(eta) }),
    };
  } else if (isMaster && job.status === 'ON_THE_WAY') {
    mainAction = {
      label: t('jobs.start'),
      onPress: () => setStatus.mutate({ status: 'IN_PROGRESS' }),
    };
  } else if (job.status === 'IN_PROGRESS') {
    mainAction = {
      label: isMaster ? t('jobs.finish') : t('jobs.confirmDone'),
      onPress: () => setStatus.mutate({ status: 'DONE' }),
      disabled: Boolean(job.pendingPriceChange),
    };
  } else if (job.canReview) {
    mainAction = {
      label: t('review.leave'),
      onPress: () => router.push({ pathname: '/review/[jobId]', params: { jobId: job.id } }),
    };
  }

  return (
    <View style={styles.safe}>
      {/* Teal header: what is happening now */}
      <SafeAreaView edges={['top']} style={[styles.hero, !active && styles.heroDone]}>
        <View style={styles.heroInner}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={styles.heroBack}
          >
            <ChevronLeft size={24} color={colors.onPrimary} strokeWidth={2.2} />
          </Pressable>
          <AppText variant="label" style={styles.heroKicker}>
            {localized(job.request.category.name)}
          </AppText>
          <AppText variant="display" color="onPrimary" accessibilityRole="header">
            {t(`jobStatus.${job.status}`)}
          </AppText>
          <AppText style={styles.heroHint}>
            {t(`jobStatusHint.${isMaster ? 'master' : 'customer'}.${job.status}`, {
              eta: job.onTheWayEtaMinutes ?? '?',
            })}
          </AppText>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {error ? <Notice tone="error" text={errorMessage(t, error)} /> : null}

        {/* The customer must answer a price change before anything else. */}
        {!isMaster && job.pendingPriceChange ? (
          <View style={styles.priceChange}>
            <AppText variant="label" color="urgentText">
              {t('jobs.priceChangeTitle')}
            </AppText>
            <AppText color="urgentText">
              {t('jobs.priceChangeText', {
                old: formatSum(job.currentPrice),
                new: formatSum(job.pendingPriceChange.newPrice),
              })}
            </AppText>
            <AppText variant="caption" color="urgentText">
              {t('jobs.reason')}: {job.pendingPriceChange.reason}
            </AppText>
            <View style={styles.row}>
              <View style={styles.flex}>
                <PrimaryButton
                  label={t('jobs.approve')}
                  loading={answer.isPending && answer.variables?.approve === true}
                  disabled={answer.isPending}
                  onPress={() => answer.mutate({ pcId: job.pendingPriceChange!.id, approve: true })}
                />
              </View>
              <View style={styles.flex}>
                <SecondaryButton
                  tall
                  tone="warm"
                  label={t('jobs.decline')}
                  loading={answer.isPending && answer.variables?.approve === false}
                  disabled={answer.isPending}
                  onPress={() =>
                    answer.mutate({ pcId: job.pendingPriceChange!.id, approve: false })
                  }
                />
              </View>
            </View>
          </View>
        ) : null}
        {isMaster && job.pendingPriceChange ? (
          <Notice
            tone="warning"
            text={t('jobs.priceChangeWaiting', {
              price: formatSum(job.pendingPriceChange.newPrice),
            })}
          />
        ) : null}

        {job.status === 'CANCELLED' ? (
          <Notice
            tone="warning"
            text={job.cancelledByMe ? t('jobs.cancelledByMe') : t('jobs.cancelledByOther')}
          />
        ) : (
          <StatusTimeline job={job} />
        )}

        {/* The other side: name, agreed price, call */}
        <Card style={styles.person}>
          <Avatar
            id={other.id}
            name={other.name ?? formatUzPhone(other.phone)}
            photoUrl={other.photoUrl}
            verified={!isMaster && job.master.verified}
          />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">
              {other.name ?? (isMaster ? t('jobs.customer') : t('offers.master'))}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {t('jobs.agreedPrice')}{' '}
              <AppText variant="caption" style={styles.bold}>
                {formatSum(price)} {t('common.sum')}
              </AppText>
            </AppText>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[jobId]', params: { jobId: job.id } })}
            accessibilityRole="button"
            accessibilityLabel={t('call.chat')}
            style={[styles.call, styles.chat]}
          >
            <MessageSquare size={24} color={colors.primary} strokeWidth={2} />
          </Pressable>
          {active ? (
            <Pressable
              // In-app call (numbers hidden); the call screen offers a normal call as fallback.
              onPress={() => router.push({ pathname: '/call/[jobId]', params: { jobId: job.id } })}
              accessibilityRole="button"
              accessibilityLabel={t('call.start')}
              style={styles.call}
            >
              <Phone size={24} color={colors.onPrimary} strokeWidth={2} />
            </Pressable>
          ) : null}
        </Card>

        {/* Money and guarantee once done */}
        {job.status === 'DONE' ? (
          <Notice
            tone="safe"
            title={`${formatSum(price)} ${t('common.sum')}`}
            text={[
              isMaster ? t('jobs.collectCash') : t('jobs.payCash'),
              job.guaranteeUntil
                ? t('jobs.guaranteeUntil', {
                    date: formatDateTime(job.guaranteeUntil).split(' ')[0],
                  })
                : null,
            ]
              .filter(Boolean)
              .join('\n')}
          />
        ) : null}

        {/* Address (both sides see it now) */}
        <Card style={styles.address}>
          <View style={styles.addressRow}>
            <MapPin size={22} color={colors.primary} strokeWidth={2} />
            <View style={styles.flex}>
              <AppText style={styles.semibold}>
                {job.request.address ?? `${districtName}, ${regionName}`}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {[job.request.landmark, districtName].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          </View>
          {isMaster && active ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <SecondaryButton
                  label="Yandex"
                  onPress={() =>
                    void Linking.openURL(yandexMapsUrl(job.request, regionName, districtName))
                  }
                />
              </View>
              <View style={styles.flex}>
                <SecondaryButton
                  label="Google"
                  onPress={() =>
                    void Linking.openURL(googleMapsUrl(job.request, regionName, districtName))
                  }
                />
              </View>
            </View>
          ) : null}
          <AppText variant="caption" color="textSecondary">
            {t('jobs.arrival')}: {formatDateTime(job.arrivalAt)}
          </AppText>
          {job.request.description ? (
            <AppText variant="caption" color="textSecondary">
              {job.request.description}
            </AppText>
          ) : null}
        </Card>

        {/* Master: how soon, before tapping "On the way" */}
        {isMaster && job.status === 'ACCEPTED' ? (
          <View style={styles.section}>
            <AppText variant="label">{t('jobs.etaLabel')}</AppText>
            <Chips
              label={t('jobs.etaLabel')}
              options={ETA_OPTIONS.map((m) => ({
                value: m,
                label: t('jobs.minutes', { count: Number(m) }),
              }))}
              value={eta}
              onChange={setEta}
            />
          </View>
        ) : null}
        {isMaster && job.status === 'ACCEPTED' ? (
          <SecondaryButton
            tone="warm"
            label={t('jobs.start')}
            onPress={() => setStatus.mutate({ status: 'IN_PROGRESS' })}
          />
        ) : null}

        {/* Master: propose a new price (the customer approves it in the app). */}
        {isMaster && active && !job.pendingPriceChange ? (
          showPriceForm ? (
            <Card>
              <TextField
                label={t('jobs.newPrice')}
                value={newPrice}
                onChangeText={(text) => setNewPrice(text.replace(/\D/g, ''))}
                keyboardType="number-pad"
              />
              <TextField
                label={t('jobs.reason')}
                value={reason}
                onChangeText={setReason}
                placeholder={t('jobs.reasonPlaceholder')}
                maxLength={300}
              />
              {formError ? <Notice tone="error" text={formError} /> : null}
              <PrimaryButton
                label={t('jobs.sendPriceChange')}
                loading={propose.isPending}
                onPress={submitPriceChange}
              />
              <SecondaryButton
                tone="warm"
                label={t('common.cancel')}
                onPress={() => setShowPriceForm(false)}
              />
            </Card>
          ) : (
            <SecondaryButton
              tone="warm"
              label={t('jobs.changePrice')}
              onPress={() => setShowPriceForm(true)}
            />
          )
        ) : null}

        {/* Trust: review, guarantee, complaints */}
        {job.review ? (
          <View style={styles.section}>
            <AppText variant="label">{t('review.yourReview')}</AppText>
            <ReviewCard review={job.review} />
          </View>
        ) : null}
        {job.guaranteeClaims.map((claim) => (
          <Notice
            key={claim.id}
            tone={claim.status === 'OPEN' ? 'warning' : 'info'}
            text={[
              `${t('guarantee.claim')}: ${t(`guarantee.status.${claim.status}`)}`,
              claim.description,
              claim.adminNote ? `${t('complaint.answer')}: ${claim.adminNote}` : null,
            ]
              .filter(Boolean)
              .join('\n')}
          />
        ))}
        {job.canClaimGuarantee ? (
          <SecondaryButton
            label={t('guarantee.button')}
            onPress={() =>
              router.push({ pathname: '/guarantee/[jobId]', params: { jobId: job.id } })
            }
          />
        ) : null}
        <SecondaryButton
          tone="warm"
          label={t('complaint.button')}
          onPress={() => router.push({ pathname: '/complaint/[jobId]', params: { jobId: job.id } })}
        />
        {canCancel ? (
          <SecondaryButton
            tone="danger"
            label={t('jobs.cancel')}
            loading={cancel.isPending}
            onPress={() => cancel.mutate(undefined)}
          />
        ) : null}
      </ScrollView>

      {mainAction ? (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <PrimaryButton
            label={mainAction.label}
            onPress={mainAction.onPress}
            loading={setStatus.isPending}
            disabled={mainAction.disabled}
          />
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.primary },
  heroDone: { backgroundColor: colors.primaryDark },
  heroInner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 28,
    gap: 6,
  },
  heroBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: { color: '#CFE8E2', fontFamily: fonts.semibold, fontSize: 14 },
  heroHint: { color: colors.primarySoft, fontSize: 17, lineHeight: 24 },
  content: { padding: spacing.xl, gap: spacing.lg },
  priceChange: {
    backgroundColor: colors.urgentSoft,
    borderWidth: 1.5,
    borderColor: '#F2C7A5',
    borderRadius: radius.xxl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bold: { fontFamily: fonts.bold, color: colors.text },
  semibold: { fontFamily: fonts.semibold },
  call: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chat: { backgroundColor: colors.primarySoft },
  address: { gap: 10 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  section: { gap: 10 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg,
  },
});
