import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Lock, Plus, Receipt, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import { formatSum, type JobDto, type PartsReceiptDto, type PaymentDto } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useAddReceipt, useAnswerReceipt, usePayment } from '@/api/payments';
import { uploadFile } from '@/api/uploads';
import { compressPhoto } from '@/media/compress';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { PrimaryButton, SecondaryButton } from './buttons';
import { Card } from './Card';
import { Notice } from './Notice';
import { PriceSummary } from './PriceSummary';
import { TextField } from './TextField';

/**
 * The money of a job on the job screen. Master (design/screens/MasterPayout.html):
 * held / cash, parts receipts, payout breakdown with commission. Customer: method,
 * receipts to approve, and the way to the "Job done?" screen.
 */
export function JobPaymentCard({ job }: { job: JobDto }) {
  const payment = usePayment(job.id);
  if (!payment.data) return null;
  return job.myRole === 'MASTER' ? (
    <MasterView job={job} payment={payment.data} />
  ) : (
    <CustomerView job={job} payment={payment.data} />
  );
}

function StatusLine({ payment }: { payment: PaymentDto }) {
  const { t } = useTranslation();
  const online = payment.method !== 'CASH';
  return (
    <View style={styles.statusLine}>
      {online ? (
        <Lock size={18} color={colors.primary} strokeWidth={2} />
      ) : (
        <Wallet size={18} color={colors.textSecondary} strokeWidth={2} />
      )}
      <AppText variant="label" color={online ? 'primary' : 'textSecondary'} style={styles.flex}>
        {t(`paymentStatus.${payment.status}`)}
      </AppText>
    </View>
  );
}

function MasterView({ job, payment }: { job: JobDto; payment: PaymentDto }) {
  const { t } = useTranslation();
  const add = useAddReceipt(job.id);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);
  const active = job.status !== 'CANCELLED';

  async function pickPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) setPhoto(await compressPhoto(asset.uri, asset.width, asset.height));
  }

  async function send() {
    const value = Number(amount);
    if (!photo || description.trim().length < 2 || !Number.isFinite(value) || value < 1000) {
      setError(new Error(t('receipts.invalid')));
      return;
    }
    setError(null);
    setSending(true);
    try {
      const photoKey = await uploadFile('parts-receipt', photo, 'image/jpeg');
      await add.mutateAsync({ photoKey, description: description.trim(), amount: value });
      setOpen(false);
      setDescription('');
      setAmount('');
      setPhoto(null);
    } catch (e) {
      setError(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <StatusLine payment={payment} />
      {payment.method !== 'CASH' && payment.held > 0 ? (
        <>
          <AppText variant="display">
            {formatSum(payment.held)} {t('common.sum')}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {t('payout.sameDay')}
          </AppText>
        </>
      ) : null}

      {payment.receipts.map((r) => (
        <ReceiptRow key={r.id} receipt={r} />
      ))}

      {active && !open ? (
        <SecondaryButton
          tone="warm"
          label={payment.receipts.length > 0 ? t('receipts.addMore') : t('receipts.add')}
          icon={<Plus size={20} color={colors.text} strokeWidth={2} />}
          onPress={() => setOpen(true)}
        />
      ) : null}
      {open ? (
        <View style={styles.form}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={styles.preview}
              accessibilityLabel={t('receipts.photo')}
            />
          ) : null}
          <SecondaryButton
            label={photo ? t('receipts.retake') : t('receipts.takePhoto')}
            icon={<Receipt size={20} color={colors.primary} strokeWidth={2} />}
            onPress={() => void pickPhoto()}
          />
          <TextField
            label={t('receipts.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('receipts.descriptionPlaceholder')}
            maxLength={200}
          />
          <TextField
            label={t('receipts.amount')}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="38000"
          />
          {error ? <Notice tone="error" text={errorMessage(t, error)} /> : null}
          <PrimaryButton label={t('receipts.send')} loading={sending} onPress={() => void send()} />
          <SecondaryButton tone="warm" label={t('common.cancel')} onPress={() => setOpen(false)} />
        </View>
      ) : null}

      <PriceSummary
        rows={[
          { label: t('payout.labor'), value: `${formatSum(payment.labor)} ${t('common.sum')}` },
          ...(payment.partsEstimate > 0
            ? [
                {
                  label: t('payout.parts'),
                  value: `${formatSum(payment.partsEstimate)} ${t('common.sum')}`,
                },
              ]
            : []),
          {
            label: t('payout.commission', { percent: payment.commissionPercent }),
            value: `−${formatSum(payment.commission)} ${t('common.sum')}`,
            negative: true,
          },
          {
            label: t('payout.youGet'),
            value: `${formatSum(payment.masterGets)} ${t('common.sum')}`,
            strong: true,
          },
        ]}
      />
      {payment.method === 'CASH' && payment.commission > 0 ? (
        <AppText variant="caption" color="textMuted">
          {t('payout.cashCommissionNote')}
        </AppText>
      ) : null}
      {payment.commissionPercent === 0 ? (
        <AppText variant="caption" color="primary">
          {t('payout.freeMonths')}
        </AppText>
      ) : null}
    </Card>
  );
}

function CustomerView({ job, payment }: { job: JobDto; payment: PaymentDto }) {
  const { t } = useTranslation();
  const answer = useAnswerReceipt(job.id);
  const pending = payment.receipts.filter((r) => r.status === 'PENDING');
  const canChange =
    (payment.status === 'CASH' || payment.status === 'PENDING') &&
    job.status !== 'DONE' &&
    job.status !== 'CANCELLED';

  return (
    <Card>
      <StatusLine payment={payment} />
      <AppText variant="h3">
        {formatSum(payment.total)} {t('common.sum')} · {t(`payment.methods.${payment.method}`)}
      </AppText>

      {pending.map((r) => (
        <View key={r.id} style={styles.form}>
          <ReceiptRow receipt={r} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <PrimaryButton
                label={t('receipts.approve')}
                loading={
                  answer.isPending &&
                  answer.variables?.receiptId === r.id &&
                  answer.variables.approve
                }
                onPress={() => answer.mutate({ receiptId: r.id, approve: true })}
              />
            </View>
            <View style={styles.flex}>
              <SecondaryButton
                tall
                tone="warm"
                label={t('receipts.reject')}
                onPress={() => answer.mutate({ receiptId: r.id, approve: false })}
              />
            </View>
          </View>
        </View>
      ))}
      {answer.isError ? <Notice tone="error" text={errorMessage(t, answer.error)} /> : null}

      {payment.canConfirm ? (
        <PrimaryButton
          label={t('confirm.open')}
          onPress={() => router.push({ pathname: '/confirm/[jobId]', params: { jobId: job.id } })}
        />
      ) : null}
      {canChange ? (
        <SecondaryButton
          label={t('payment.change')}
          onPress={() => router.push({ pathname: '/payment/[jobId]', params: { jobId: job.id } })}
        />
      ) : null}
    </Card>
  );
}

function ReceiptRow({ receipt }: { receipt: PartsReceiptDto }) {
  const { t } = useTranslation();
  const tone =
    receipt.status === 'APPROVED' ? 'teal' : receipt.status === 'REJECTED' ? 'gold' : 'blue';
  return (
    <View style={styles.receipt}>
      <Image
        source={{ uri: receipt.photoUrl }}
        style={styles.receiptPhoto}
        accessibilityLabel={receipt.description}
      />
      <View style={styles.flex}>
        <AppText variant="label">{receipt.description}</AppText>
        <AppText variant="caption" color="textSecondary">
          {formatSum(receipt.amount)} {t('common.sum')}
        </AppText>
      </View>
      <Badge tone={tone} label={t(`receipts.status.${receipt.status}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', gap: spacing.sm },
  form: { gap: spacing.md },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  receiptPhoto: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
});
