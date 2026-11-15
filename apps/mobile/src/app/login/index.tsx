import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeUzPhone, type OtpRequestResponse } from '@usta/shared';
import { api } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';

/** "901234567" → "90 123 45 67" while typing. */
function formatLocal(digits: string): string {
  const d = digits.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

export default function PhoneScreen() {
  const { t } = useTranslation();
  const [digits, setDigits] = useState('');
  const [showInvalid, setShowInvalid] = useState(false);

  const phone = normalizeUzPhone(digits);

  // useMutation: TanStack Query tracks loading/error state of a server call for us.
  const requestCode = useMutation({
    mutationFn: (validPhone: string) =>
      api<OtpRequestResponse>('/auth/otp/request', {
        method: 'POST',
        auth: false,
        body: { phone: validPhone },
      }),
    onSuccess: (data, validPhone) => {
      router.push({
        pathname: '/login/code',
        params: { phone: validPhone, resendAfter: String(data.resendAfterSeconds) },
      });
    },
  });

  function submit() {
    if (!phone) {
      setShowInvalid(true);
      return;
    }
    requestCode.mutate(phone);
  }

  return (
    <Screen
      title={t('login.phoneTitle')}
      subtitle={t('login.phoneSubtitle')}
      footer={
        <BigButton label={t('login.sendCode')} onPress={submit} loading={requestCode.isPending} />
      }
    >
      <TextField
        label={t('login.phoneLabel')}
        prefix="+998"
        value={formatLocal(digits)}
        onChangeText={(text) => {
          setDigits(text.replace(/\D/g, '').slice(0, 9));
          setShowInvalid(false);
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="90 123 45 67"
        maxLength={12}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        error={showInvalid ? t('login.phoneInvalid') : null}
      />
      {requestCode.isError ? (
        <Notice tone="error" text={errorMessage(t, requestCode.error)} />
      ) : null}
    </Screen>
  );
}
