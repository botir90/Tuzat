import { router, useLocalSearchParams } from 'expo-router';
import { Info } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COMPLAINT_REASONS, type ComplaintReason } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useJob } from '@/api/jobs';
import { useCreateComplaint, useMyComplaints } from '@/api/trust';
import { uploadFile } from '@/api/uploads';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/buttons';
import { Notice } from '@/components/Notice';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import type { DraftPhoto, DraftVoice } from '@/requests/draft';
import { formatDateTime } from '@/requests/schedule';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * Report a problem with a job (design/screens/Dispute.html): reason, photo or voice,
 * what happens next. Both sides can use it. The "money frozen" notice comes with
 * online payments (M6.7).
 */
export default function ComplaintScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useJob(jobId).data;
  const complaints = useMyComplaints(jobId);
  const create = useCreateComplaint(jobId);
  const [reason, setReason] = useState<ComplaintReason | null>(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [voice, setVoice] = useState<DraftVoice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isMaster = job?.myRole === 'MASTER';
  // A master doesn't complain about "the master asked for more money".
  const reasons = COMPLAINT_REASONS.filter((r) => !(isMaster && r === 'ASKED_MORE_MONEY'));

  async function submit() {
    if (!reason) {
      setFormError(t('complaint.reasonRequired'));
      return;
    }
    if (reason === 'OTHER' && text.trim().length < 5 && photos.length === 0 && !voice) {
      setFormError(t('complaint.tooShort'));
      return;
    }
    setFormError(null);
    setError(null);
    setSending(true);
    try {
      const photoKeys: string[] = [];
      for (const photo of photos) {
        photoKeys.push(await uploadFile('complaint-photo', photo.uri, 'image/jpeg'));
      }
      const voiceKey = voice
        ? await uploadFile('complaint-voice', voice.uri, 'audio/mp4')
        : undefined;
      await create.mutateAsync({ reason, text: text.trim(), photoKeys, voiceKey });
      setSent(true);
      setReason(null);
      setText('');
      setPhotos([]);
      setVoice(null);
    } catch (e) {
      setError(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={t('complaint.title')} />
        {sent ? <Notice tone="safe" text={t('complaint.sent')} /> : null}

        <View style={styles.section}>
          <AppText variant="h3">{t('complaint.whatHappened')}</AppText>
          <View style={styles.reasons} accessibilityRole="radiogroup">
            {reasons.map((r) => {
              const selected = r === reason;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    setReason(r);
                    setFormError(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.reason, selected && styles.reasonSelected]}
                >
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <AppText variant="label" style={selected ? null : styles.semibold}>
                    {t(`complaintReasons.${r}`)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('complaint.textPlaceholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('complaint.textLabel')}
          multiline
          maxLength={2000}
          style={styles.input}
        />
        <PhotoPicker
          photos={photos}
          onChange={setPhotos}
          trailing={<VoiceRecorder voice={voice} onChange={setVoice} />}
        />

        <View style={styles.next}>
          <Info size={22} color={colors.infoText} strokeWidth={2} />
          <View style={styles.flex}>
            <AppText variant="label">{t('complaint.nextTitle')}</AppText>
            <AppText variant="caption" color="textSecondary">
              {t('complaint.nextText')}
            </AppText>
          </View>
        </View>

        {complaints.data && complaints.data.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="h3">{t('complaint.history')}</AppText>
            {complaints.data.map((c) => (
              <Notice
                key={c.id}
                tone={c.status === 'OPEN' ? 'warning' : 'info'}
                text={[
                  `${formatDateTime(c.createdAt)} — ${t(`complaint.status.${c.status}`)}`,
                  c.reason ? t(`complaintReasons.${c.reason}`) : null,
                  c.text || null,
                  c.adminNote ? `${t('complaint.answer')}: ${c.adminNote}` : null,
                ]
                  .filter(Boolean)
                  .join('\n')}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {formError ? <Notice tone="error" text={formError} /> : null}
        {error ? <Notice tone="error" text={errorMessage(t, error)} /> : null}
        <PrimaryButton
          label={t('complaint.submit')}
          onPress={() => void submit()}
          loading={sending}
        />
        {sent ? (
          <AppText variant="caption" color="primary" align="center" onPress={() => router.back()}>
            {t('common.back')}
          </AppText>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.lg },
  section: { gap: 10 },
  reasons: { gap: spacing.sm },
  reason: {
    minHeight: 56,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reasonSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
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
  input: {
    minHeight: 96,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlignVertical: 'top',
  },
  next: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },
  flex: { flex: 1, gap: 4 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: 10,
  },
});
