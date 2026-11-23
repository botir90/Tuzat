import { router, useLocalSearchParams } from 'expo-router';
import { Clock, Lock, ThumbsUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatSum } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useJob } from '@/api/jobs';
import { useConfirmJob, usePayment } from '@/api/payments';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { hoursLeft } from '@/jobs/countdown';
import { colors, radius, spacing } from '@/theme';

/**
 * "Was the job done well?" (design/screens/ConfirmJob.html): the held amount, approved parts
 * receipts, the time left before the money goes to the master by itself, and two answers.
 */
export default function ConfirmJobScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useJob(jobId).data;
  const payment = usePayment(jobId);
  const confirm = useConfirmJob(jobId);
  const data = payment.data;
  const left = hoursLeft(data?.releaseDueAt ?? null);
  const approvedReceipts = data?.receipts.filter((r) => r.status === 'APPROVED') ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {job ? (
          <View style={styles.hero}>
            <Avatar
              id={job.master.id}
              name={job.master.name}
              photoUrl={job.master.photoUrl}
              size={72}
            />
            <AppText color="textSecondary" align="center">
              {t('confirm.masterSaysDone', { name: job.master.name ?? t('offers.master') })}
            </AppText>
            <AppText variant="h1" align="center" accessibilityRole="header">
              {t('confirm.question')}
            </AppText>
          </View>
        ) : null}

        <QueryState
          isLoading={payment.isLoading}
          error={payment.error}
          onRetry={() => void payment.refetch()}
        />

        {data ? (
          <>
            <View style={styles.held}>
              <Lock size={24} color={colors.primary} strokeWidth={2} />
              <View style={styles.flex}>
                <AppText variant="caption" color="textSecondary">
                  {t('confirm.held')}
                </AppText>
                <AppText variant="h2">
                  {formatSum(data.held)} {t('common.sum')}
                </AppText>
              </View>
            </View>

            {approvedReceipts.map((r) => (
              <Card key={r.id}>
                <View style={styles.receiptTop}>
                  <AppText variant="label">{t('confirm.receipt')}</AppText>
                  <Badge tone="teal" label={t('receipts.approved')} />
                </View>
                <View style={styles.receiptRow}>
                  <Image
                    source={{ uri: r.photoUrl }}
                    style={styles.receiptPhoto}
                    accessibilityLabel={r.description}
                  />
                  <AppText variant="caption" color="textSecondary" style={styles.flex}>
                    {t('confirm.receiptPaid', {
                      description: r.description,
                      amount: formatSum(r.amount),
                    })}
                  </AppText>
                </View>
              </Card>
            ))}

            {left !== null && data.canConfirm ? (
              <View style={styles.countdown}>
                <Clock size={22} color={colors.goldText} strokeWidth={2} />
                <AppText variant="caption" color="goldText" style={styles.flex}>
                  {t('confirm.autoRelease', { count: left })}
                </AppText>
              </View>
            ) : null}

            {!data.canConfirm ? (
              <Notice
                tone={data.disputeOpen ? 'warning' : 'safe'}
                text={
                  data.disputeOpen
                    ? t('confirm.frozen')
                    : data.status === 'RELEASED'
                      ? t('confirm.alreadyReleased')
                      : t('confirm.nothingToConfirm')
                }
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {data?.canConfirm ? (
        <View style={styles.footer}>
          {confirm.isError ? <Notice tone="error" text={errorMessage(t, confirm.error)} /> : null}
          <PrimaryButton
            label={t('confirm.yes')}
            icon={<ThumbsUp size={20} color={colors.onPrimary} strokeWidth={2} />}
            loading={confirm.isPending}
            onPress={() =>
              confirm.mutate(undefined, {
                onSuccess: () => router.replace({ pathname: '/review/[jobId]', params: { jobId } }),
              })
            }
          />
          <SecondaryButton
            tall
            tone="warm"
            label={t('confirm.no')}
            onPress={() => router.push({ pathname: '/complaint/[jobId]', params: { jobId } })}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 40, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  held: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xxxl,
    padding: spacing.lg,
  },
  receiptTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  receiptPhoto: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: 10,
  },
});
