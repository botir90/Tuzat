import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatUzPhone } from '@usta/shared';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';

/** Master home. Orders feed arrives in M4. */
export default function MasterHome() {
  const { t } = useTranslation();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  // Masters always need an account (e.g. after the session expired).
  if (status !== 'signedIn') return <Redirect href="/login" />;

  return (
    <Screen
      title={t('master.title')}
      footer={
        <BigButton
          label={t('common.settings')}
          variant="outline"
          onPress={() => router.push('/settings')}
        />
      }
    >
      {user ? <Notice text={t('home.loggedInAs', { phone: formatUzPhone(user.phone) })} /> : null}
      <Notice text={t('master.comingSoon')} />
    </Screen>
  );
}
