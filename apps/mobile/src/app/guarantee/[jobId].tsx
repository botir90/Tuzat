import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { errorMessage } from '@/api/errors';
import { useCreateGuaranteeClaim } from '@/api/trust';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';

/** "The problem came back": ask for a free return visit within the guarantee period. */
export default function GuaranteeScreen() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const claim = useCreateGuaranteeClaim(jobId);
  const [description, setDescription] = useState('');
  const [tooShort, setTooShort] = useState(false);

  function submit() {
    if (description.trim().length < 5) {
      setTooShort(true);
      return;
    }
    setTooShort(false);
    claim.mutate({ description: description.trim() }, { onSuccess: () => router.back() });
  }

  return (
    <Screen
      title={t('guarantee.title')}
      subtitle={t('guarantee.subtitle')}
      footer={
        <>
          {claim.isError ? <Notice tone="error" text={errorMessage(t, claim.error)} /> : null}
          <BigButton label={t('guarantee.submit')} onPress={submit} loading={claim.isPending} />
          <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
        </>
      }
    >
      <TextField
        label={t('guarantee.descriptionLabel')}
        value={description}
        onChangeText={setDescription}
        placeholder={t('guarantee.descriptionPlaceholder')}
        multiline
        maxLength={1000}
        style={styles.multiline}
        error={tooShort ? t('guarantee.tooShort') : null}
      />
      <Notice text={t('guarantee.howItWorks')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
