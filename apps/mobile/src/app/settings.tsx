import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { formatUzPhone, type SelectableRole } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { currentLanguage } from '@/i18n';
import { LANGUAGE_NATIVE_NAMES } from '@/i18n/resources';
import { colors, fontSize } from '@/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { status, user, mode, setMode, signOut } = useAuth();

  const switchMode = useMutation({
    mutationFn: (next: SelectableRole) => setMode(next),
    onSuccess: () => {
      router.dismissAll();
      router.replace('/');
    },
  });

  const logout = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      router.dismissAll();
      router.replace('/');
    },
  });

  const otherMode: SelectableRole = mode === 'MASTER' ? 'CUSTOMER' : 'MASTER';

  return (
    <Screen
      title={t('settings.title')}
      tabBar={mode === 'MASTER' ? undefined : 'profile'}
      back={mode === 'MASTER'}
      footer={
        <BigButton label={t('common.back')} variant="outline" onPress={() => router.back()} />
      }
    >
      <Text style={styles.section}>{t('settings.language')}</Text>
      <BigButton
        label={LANGUAGE_NATIVE_NAMES[currentLanguage()]}
        variant="outline"
        onPress={() => router.push('/language')}
      />

      <Text style={styles.section}>
        {t('settings.mode')}:{' '}
        {mode === 'MASTER' ? t('settings.modeMaster') : t('settings.modeCustomer')}
      </Text>
      <BigButton
        label={
          otherMode === 'MASTER' ? t('settings.switchToMaster') : t('settings.switchToCustomer')
        }
        variant="outline"
        loading={switchMode.isPending}
        onPress={() => switchMode.mutate(otherMode)}
      />
      {switchMode.isError ? <Notice tone="error" text={errorMessage(t, switchMode.error)} /> : null}

      <Text style={styles.section}>{t('settings.account')}</Text>
      {status === 'signedIn' && user ? (
        <>
          <Notice text={formatUzPhone(user.phone)} />
          <BigButton
            label={t('settings.logout')}
            variant="danger"
            loading={logout.isPending}
            onPress={() => logout.mutate()}
          />
        </>
      ) : (
        <Notice text={t('settings.notLoggedIn')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: fontSize.small, fontWeight: '700', color: colors.textMuted, marginTop: 8 },
});
