import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { formatSum, formatUzPhone, type JobDto } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useAnswerPrice, useCancelJob, useJob, useJobStatus, useProposePrice } from '@/api/jobs';
import { BigButton } from '@/components/BigButton';
import { Chips } from '@/components/Chips';
import { MasterInfo } from '@/components/MasterInfo';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { ReviewCard } from '@/components/ReviewCard';
import { Screen } from '@/components/Screen';
import { StatusSteps } from '@/components/StatusSteps';
import { TextField } from '@/components/TextField';
import { useLocalized } from '@/i18n/useLocalized';
import { callPhone, googleMapsUrl, yandexMapsUrl } from '@/jobs/links';
import { describeDesiredTime } from '@/requests/describe';
import { formatDateTime } from '@/requests/schedule';
import { colors, fontSize, spacing } from '@/theme';

const ETA_OPTIONS = ['10', '20', '30', '60'] as const;

/** One screen for both sides: what is happening now, what happens next, and the actions. */
export default function JobScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);

  if (!job.data) {
    return (
      <Screen title={t('jobs.title')}>
        <QueryState
          isLoading={job.isLoading}
          error={job.error}
          onRetry={() => void job.refetch()}
        />
      </Screen>
    );
  }
  return <JobView job={job.data} />;
}

function JobView({ job }: { job: JobDto }) {
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
  const other = isMaster
    ? { title: t('jobs.customer'), name: job.customer.name, phone: job.customer.phone }
    : { title: t('jobs.master'), name: job.master.name, phone: job.master.phone };
  const regionName = localized(job.request.region.name);
  const districtName = localized(job.request.district.name);
  const error = setStatus.error ?? cancel.error ?? propose.error ?? answer.error;

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

  return (
    <Screen
      title={localized(job.request.category.name)}
      subtitle={t(`jobStatusHint.${isMaster ? 'master' : 'customer'}.${job.status}`, {
        eta: job.onTheWayEtaMinutes ?? '?',
      })}
      footer={
        <BigButton
          label={t('common.back')}
          variant="outline"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      }
    >
      {error ? <Notice tone="error" text={errorMessage(t, error)} /> : null}

      {/* The customer must answer a price change before anything else. */}
      {!isMaster && job.pendingPriceChange ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>{t('jobs.priceChangeTitle')}</Text>
          <Text style={styles.body}>
            {t('jobs.priceChangeText', {
              old: formatSum(job.currentPrice),
              new: formatSum(job.pendingPriceChange.newPrice),
            })}
          </Text>
          <Text style={styles.body}>
            {t('jobs.reason')}: {job.pendingPriceChange.reason}
          </Text>
          <BigButton
            label={t('jobs.approve')}
            loading={answer.isPending}
            onPress={() => answer.mutate({ pcId: job.pendingPriceChange!.id, approve: true })}
          />
          <BigButton
            label={t('jobs.decline')}
            variant="danger"
            disabled={answer.isPending}
            onPress={() => answer.mutate({ pcId: job.pendingPriceChange!.id, approve: false })}
          />
        </View>
      ) : null}
      {isMaster && job.pendingPriceChange ? (
        <Notice
          tone="warning"
          text={t('jobs.priceChangeWaiting', { price: formatSum(job.pendingPriceChange.newPrice) })}
        />
      ) : null}

      {job.status === 'CANCELLED' ? (
        <Notice
          tone="warning"
          text={job.cancelledByMe ? t('jobs.cancelledByMe') : t('jobs.cancelledByOther')}
        />
      ) : (
        <StatusSteps status={job.status} />
      )}

      <View style={styles.box}>
        <Text style={styles.label}>{t('jobs.price')}</Text>
        <Text style={styles.price}>
          {formatSum(job.finalPrice ?? job.currentPrice)} {t('jobs.som')}
        </Text>
        {job.status === 'DONE' ? (
          <Text style={styles.body}>{isMaster ? t('jobs.collectCash') : t('jobs.payCash')}</Text>
        ) : null}
        {job.guaranteeUntil ? (
          <Text style={styles.body}>
            {t('jobs.guaranteeUntil', { date: formatDateTime(job.guaranteeUntil).split(' ')[0] })}
          </Text>
        ) : null}
      </View>

      {/* Master's main action: the next status. */}
      {isMaster && job.status === 'ACCEPTED' ? (
        <>
          <Text style={styles.label}>{t('jobs.etaLabel')}</Text>
          <Chips
            label={t('jobs.etaLabel')}
            options={ETA_OPTIONS.map((m) => ({
              value: m,
              label: t('jobs.minutes', { count: Number(m) }),
            }))}
            value={eta}
            onChange={setEta}
          />
          <BigButton
            label={t('jobs.onTheWay')}
            loading={setStatus.isPending}
            onPress={() => setStatus.mutate({ status: 'ON_THE_WAY', etaMinutes: Number(eta) })}
          />
        </>
      ) : null}
      {isMaster && (job.status === 'ACCEPTED' || job.status === 'ON_THE_WAY') ? (
        <BigButton
          label={t('jobs.start')}
          variant={job.status === 'ON_THE_WAY' ? 'primary' : 'outline'}
          loading={setStatus.isPending}
          onPress={() => setStatus.mutate({ status: 'IN_PROGRESS' })}
        />
      ) : null}
      {job.status === 'IN_PROGRESS' ? (
        <BigButton
          label={isMaster ? t('jobs.finish') : t('jobs.confirmDone')}
          loading={setStatus.isPending}
          disabled={Boolean(job.pendingPriceChange)}
          onPress={() => setStatus.mutate({ status: 'DONE' })}
        />
      ) : null}

      {/* Contact and address: shared only now that the master is chosen. */}
      <Text style={styles.label}>{other.title}</Text>
      {isMaster ? (
        <Text style={styles.body}>{other.name ?? formatUzPhone(other.phone)}</Text>
      ) : (
        <MasterInfo master={job.master} />
      )}
      {active ? (
        <BigButton
          label={t('jobs.call', { phone: formatUzPhone(other.phone) })}
          variant="outline"
          onPress={() => void callPhone(other.phone)}
        />
      ) : null}

      <Text style={styles.label}>{t('request.where')}</Text>
      <Text style={styles.body}>
        {districtName}, {regionName}
        {job.request.address ? `\n${job.request.address}` : ''}
        {job.request.landmark ? `\n${job.request.landmark}` : ''}
      </Text>
      {isMaster && active ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <BigButton
              label="Yandex"
              variant="outline"
              onPress={() =>
                void Linking.openURL(yandexMapsUrl(job.request, regionName, districtName))
              }
            />
          </View>
          <View style={styles.flex}>
            <BigButton
              label="Google"
              variant="outline"
              onPress={() =>
                void Linking.openURL(googleMapsUrl(job.request, regionName, districtName))
              }
            />
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>{t('jobs.arrival')}</Text>
      <Text style={styles.body}>
        {formatDateTime(job.arrivalAt)} ({describeDesiredTime(t, job.request)})
      </Text>
      {job.request.description ? (
        <>
          <Text style={styles.label}>{t('request.describe')}</Text>
          <Text style={styles.body}>{job.request.description}</Text>
        </>
      ) : null}

      {/* Master: propose a new price (customer must approve it in the app). */}
      {isMaster && active && !job.pendingPriceChange ? (
        showPriceForm ? (
          <View style={styles.box}>
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
            <BigButton
              label={t('jobs.sendPriceChange')}
              loading={propose.isPending}
              onPress={submitPriceChange}
            />
            <BigButton
              label={t('common.back')}
              variant="outline"
              onPress={() => setShowPriceForm(false)}
            />
          </View>
        ) : (
          <BigButton
            label={t('jobs.changePrice')}
            variant="outline"
            onPress={() => setShowPriceForm(true)}
          />
        )
      ) : null}

      {/* Trust: review, guarantee and complaints (M6). */}
      {job.review ? (
        <>
          <Text style={styles.label}>{t('review.yourReview')}</Text>
          <ReviewCard review={job.review} />
        </>
      ) : null}
      {job.canReview ? (
        <BigButton
          label={t('review.leave')}
          onPress={() => router.push({ pathname: '/review/[jobId]', params: { jobId: job.id } })}
        />
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
        <BigButton
          label={t('guarantee.button')}
          variant="outline"
          onPress={() => router.push({ pathname: '/guarantee/[jobId]', params: { jobId: job.id } })}
        />
      ) : null}
      <BigButton
        label={t('complaint.button')}
        variant="outline"
        onPress={() => router.push({ pathname: '/complaint/[jobId]', params: { jobId: job.id } })}
      />

      {canCancel ? (
        <BigButton
          label={t('jobs.cancel')}
          variant="danger"
          loading={cancel.isPending}
          onPress={() => cancel.mutate(undefined)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  boxTitle: { fontSize: fontSize.subtitle, fontWeight: '700', color: colors.text },
  label: { fontSize: fontSize.small, fontWeight: '700', color: colors.textMuted, marginTop: 4 },
  body: { fontSize: fontSize.body, color: colors.text, lineHeight: 26 },
  price: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
