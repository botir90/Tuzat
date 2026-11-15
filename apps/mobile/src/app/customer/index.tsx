import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { APP_NAME, formatUzPhone } from '@usta/shared';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';

/** Customer home. Categories arrive in M2. */
export default function CustomerHome() {
  const { t } = useTranslation();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  return (
    <Screen
      title={t('home.welcome')}
      subtitle={t('home.subtitle')}
      footer={
        <>
          {status !== 'signedIn' ? (
            <BigButton label={t('home.login')} onPress={() => router.push('/login')} />
          ) : null}
          <BigButton
            label={t('common.settings')}
            variant="outline"
            onPress={() => router.push('/settings')}
          />
        </>
      }
    >
      <Notice text={APP_NAME} />
      {user ? <Notice text={t('home.loggedInAs', { phone: formatUzPhone(user.phone) })} /> : null}
    </Screen>
  );
}
