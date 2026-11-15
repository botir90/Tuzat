import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { SelectableRole } from '@usta/shared';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';

/** "I need a master" or "I am a master". */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const setMode = useAuth((s) => s.setMode);

  async function choose(mode: SelectableRole) {
    await setMode(mode);
    router.replace('/');
  }

  return (
    <Screen title={t('welcome.title')} subtitle={t('welcome.subtitle')}>
      <BigButton
        label={t('welcome.customer')}
        hint={t('welcome.customerHint')}
        variant="outline"
        onPress={() => void choose('CUSTOMER')}
      />
      <BigButton
        label={t('welcome.master')}
        hint={t('welcome.masterHint')}
        variant="outline"
        onPress={() => void choose('MASTER')}
      />
    </Screen>
  );
}
