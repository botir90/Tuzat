import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { errorMessage } from '@/api/errors';
import { useCreateComplaint, useMyComplaints } from '@/api/trust';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { formatDateTime } from '@/requests/schedule';
import { colors, fontSize } from '@/theme';

/** Tell the support team about a problem with a job. Available to both sides. */
export default function ComplaintScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const complaints = useMyComplaints(jobId);
  const create = useCreateComplaint(jobId);
  const [text, setText] = useState('');
  const [tooShort, setTooShort] = useState(false);

  function submit() {
    if (text.trim().length < 5) {
      setTooShort(true);
      return;
    }
    setTooShort(false);
    create.mutate({ text: text.trim() }, { onSuccess: () => setText('') });
  }

  return (
    <Screen
      title={t('complaint.title')}
      subtitle={t('complaint.subtitle')}
      footer={
        <>
          {create.isError ? <Notice tone="error" text={errorMessage(t, create.error)} /> : null}
          {create.isSuccess ? <Notice text={t('complaint.sent')} /> : null}
          <BigButton label={t('complaint.submit')} onPress={submit} loading={create.isPending} />
          <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
        </>
      }
    >
      <TextField
        label={t('complaint.textLabel')}
        value={text}
        onChangeText={setText}
        placeholder={t('complaint.textPlaceholder')}
        multiline
        maxLength={2000}
        style={styles.multiline}
        error={tooShort ? t('complaint.tooShort') : null}
      />

      {complaints.data && complaints.data.length > 0 ? (
        <>
          <Text style={styles.label}>{t('complaint.history')}</Text>
          {complaints.data.map((c) => (
            <Notice
              key={c.id}
              tone={c.status === 'OPEN' ? 'warning' : 'info'}
              text={[
                `${formatDateTime(c.createdAt)} — ${t(`complaint.status.${c.status}`)}`,
                c.text,
                c.adminNote ? `${t('complaint.answer')}: ${c.adminNote}` : null,
              ]
                .filter(Boolean)
                .join('\n')}
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.small, fontWeight: '700', color: colors.textMuted },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
