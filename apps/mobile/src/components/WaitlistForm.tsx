import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeUzPhone } from '@usta/shared';
import { api } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/store';
import { BigButton } from './BigButton';
import { Notice } from './Notice';
import { TextField } from './TextField';

interface WaitlistFormProps {
  regionId: string;
  districtId: string;
  categoryId?: string;
}

/** "No masters here yet, leave your number and we'll notify you." */
export function WaitlistForm({ regionId, districtId, categoryId }: WaitlistFormProps) {
  const { t } = useTranslation();
  const userPhone = useAuth((s) => s.user?.phone);
  const [digits, setDigits] = useState(userPhone ? userPhone.slice(4) : '');
  const [invalid, setInvalid] = useState(false);

  const submit = useMutation({
    mutationFn: (phone: string) =>
      api('/waitlist', {
        method: 'POST',
        auth: false,
        body: { phone, regionId, districtId, categoryId },
      }),
  });

  if (submit.isSuccess) return <Notice text={t('waitlist.thanks')} />;

  function onSubmit() {
    const phone = normalizeUzPhone(digits);
    if (!phone) {
      setInvalid(true);
      return;
    }
    submit.mutate(phone);
  }

  return (
    <>
      <TextField
        label={t('login.phoneLabel')}
        prefix="+998"
        value={digits}
        onChangeText={(text) => {
          setDigits(text.replace(/\D/g, '').slice(0, 9));
          setInvalid(false);
        }}
        keyboardType="phone-pad"
        placeholder="90 123 45 67"
        error={invalid ? t('login.phoneInvalid') : null}
      />
      <BigButton label={t('waitlist.notifyMe')} onPress={onSubmit} loading={submit.isPending} />
      {submit.isError ? <Notice tone="error" text={errorMessage(t, submit.error)} /> : null}
    </>
  );
}
