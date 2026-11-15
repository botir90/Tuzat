import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  OTP_LENGTH,
  formatUzPhone,
  type AuthResponse,
  type OtpRequestResponse,
} from '@usta/shared';
import { api } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useCountdown } from '@/hooks/useCountdown';
import { currentLanguage } from '@/i18n';

export default function CodeScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ phone: string; resendAfter?: string; next?: string }>();
  const phone = params.phone;
  const [code, setCode] = useState('');
  const countdown = useCountdown(Number(params.resendAfter ?? 60));
  const signIn = useAuth((s) => s.signIn);
  const mode = useAuth((s) => s.mode);

  const verify = useMutation({
    mutationFn: (value: string) =>
      api<AuthResponse>('/auth/otp/verify', {
        method: 'POST',
        auth: false,
        body: { phone, code: value, role: mode ?? undefined, language: currentLanguage() },
      }),
    onSuccess: async (response) => {
      await signIn(response);
      if (params.next === 'back') {
        // Opened from a form (e.g. a new request): close the 2 login screens, continue there.
        router.dismiss(2);
        return;
      }
      router.dismissAll();
      router.replace('/');
    },
  });

  const resend = useMutation({
    mutationFn: () =>
      api<OtpRequestResponse>('/auth/otp/request', {
        method: 'POST',
        auth: false,
        body: { phone },
      }),
    onSuccess: (data) => {
      setCode('');
      verify.reset();
      countdown.restart(data.resendAfterSeconds);
    },
  });

  function onChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digits);
    // Submit automatically when all digits are in (also works with SMS autofill).
    if (digits.length === OTP_LENGTH && !verify.isPending) verify.mutate(digits);
  }

  const error = verify.error ?? resend.error;

  return (
    <Screen
      title={t('login.codeTitle')}
      subtitle={t('login.codeSubtitle', { phone: formatUzPhone(phone) })}
      footer={
        <>
          <BigButton
            label={t('login.verify')}
            onPress={() => verify.mutate(code)}
            disabled={code.length !== OTP_LENGTH}
            loading={verify.isPending}
          />
          <BigButton
            label={
              countdown.secondsLeft > 0
                ? t('login.resendIn', { seconds: countdown.secondsLeft })
                : t('login.resend')
            }
            variant="outline"
            disabled={countdown.secondsLeft > 0}
            loading={resend.isPending}
            onPress={() => resend.mutate()}
          />
          <BigButton
            label={t('login.changePhone')}
            variant="outline"
            onPress={() => router.back()}
          />
        </>
      }
    >
      <TextField
        label={t('login.codeLabel')}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={OTP_LENGTH}
        autoFocus
        style={{ letterSpacing: 8, fontSize: 24 }}
      />
      {error ? <Notice tone="error" text={errorMessage(t, error)} /> : null}
    </Screen>
  );
}
