import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatSum, type PaymentMethod } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useJob } from '@/api/jobs';
import { useChoosePayment, usePayment } from '@/api/payments';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/buttons';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { PriceSummary } from '@/components/PriceSummary';
import { QueryState } from '@/components/QueryState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLocalized } from '@/i18n/useLocalized';
import { colors, fonts, radius, spacing } from '@/theme';

const METHODS: PaymentMethod[] = ['CLICK', 'PAYME', 'CASH'];

/**
 * How to pay (design/screens/Payment.html), right after choosing the master.
 * Online (Click / Payme) holds the money safely until the customer confirms the job;
 * until online payments are switched on, cash is the only choice.
 */
export default function PaymentScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useJob(jobId).data;
  const payment = usePayment(jobId);
  const choose = useChoosePayment(jobId);
  const data = payment.data;
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const selected = method ?? (data?.onlineAvailable ? 'CLICK' : 'CASH');

  const goToJob = () => router.replace({ pathname: '/jobs/[id]', params: { id: jobId } });

  function submit() {
    if (!data) return;
    if (selected === data.method && data.status !== 'PENDING') {
      goToJob();
      return;
    }
    choose.mutate(selected, { onSuccess: goToJob });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t('payment.title')} onBack={goToJob} />
        <QueryState
          isLoading={payment.isLoading}
          error={payment.error}
          onRetry={() => void payment.refetch()}
        />

        {/* "Your money is safe": how escrow works */}
        <View style={styles.safeBox}>
          <View style={styles.safeTitle}>
            <ShieldCheck size={24} color={colors.primary} strokeWidth={2} />
            <AppText variant="h3">{t('payment.safeTitle')}</AppText>
          </View>
          {(['payment.step1', 'payment.step2', 'payment.step3'] as const).map((key, index) => (
            <View key={key} style={styles.step}>
              <View style={styles.stepNumber}>
                <AppText variant="tiny" color="onPrimary">
                  {index + 1}
                </AppText>
              </View>
              <AppText variant="caption" style={styles.flex}>
                {t(key)}
              </AppText>
            </View>
          ))}
        </View>

        {/* What is paid */}
        {data && job ? (
          <Card>
            <View style={styles.who}>
              <Avatar
                id={job.master.id}
                name={job.master.name}
                photoUrl={job.master.photoUrl}
                size={36}
              />
              <AppText variant="label" style={styles.flex}>
                {[job.master.name, localized(job.request.category.name)]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
            <PriceSummary
              rows={[
                { label: t('payment.labor'), value: `${formatSum(data.labor)} ${t('common.sum')}` },
                ...(data.partsEstimate > 0
                  ? [
                      {
                        label: t('payment.partsEstimate'),
                        value: `${formatSum(data.partsEstimate)} ${t('common.sum')}`,
                      },
                    ]
                  : []),
                {
                  label: t('payment.total'),
                  value: `${formatSum(data.total)} ${t('common.sum')}`,
                  strong: true,
                },
              ]}
            />
          </Card>
        ) : null}

        {/* Method */}
        {data ? (
          <View style={styles.section}>
            <AppText variant="h3">{t('payment.method')}</AppText>
            <View style={styles.methods} accessibilityRole="radiogroup">
              {METHODS.map((m) => {
                const online = m !== 'CASH';
                const disabled = online && !data.onlineAvailable;
                const isSelected = m === selected;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(m)}
                    disabled={disabled}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, disabled }}
                    style={[
                      styles.method,
                      isSelected && styles.methodSelected,
                      disabled && styles.disabled,
                    ]}
                  >
                    <View style={[styles.radio, isSelected && styles.radioOn]}>
                      {isSelected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <AppText variant="bodyStrong" style={styles.flex}>
                      {t(`payment.methods.${m}`)}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={online ? 'primary' : 'textSecondary'}
                      style={styles.semibold}
                    >
                      {disabled
                        ? t('payment.soon')
                        : online
                          ? t('payment.onlineNote')
                          : t('payment.cashNote')}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {!data.onlineAvailable ? <Notice text={t('payment.onlineLater')} /> : null}
          </View>
        ) : null}
      </ScrollView>

      {data ? (
        <View style={styles.footer}>
          {choose.isError ? <Notice tone="error" text={errorMessage(t, choose.error)} /> : null}
          <PrimaryButton
            label={
              selected === 'CASH'
                ? t('payment.continueCash')
                : t('payment.payOnline', { price: formatSum(data.total) })
            }
            loading={choose.isPending}
            onPress={submit}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg },
  safeBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xxxl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  safeTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  section: { gap: 10 },
  methods: { gap: spacing.sm },
  method: {
    minHeight: 60,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  methodSelected: { borderWidth: 2, borderColor: colors.primary },
  disabled: { opacity: 0.55 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.placeholderBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  semibold: { fontFamily: fonts.semibold },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: 10,
  },
});
