import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, type Language } from '@usta/shared';
import { api } from '@/api/client';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { changeLanguage, currentLanguage } from '@/i18n';
import { LANGUAGE_NATIVE_NAMES } from '@/i18n/resources';

export default function LanguageScreen() {
  // useTranslation re-renders this screen when the language changes.
  const { t } = useTranslation();
  const selected = currentLanguage();

  async function onSelect(language: Language) {
    await changeLanguage(language);
    // Remember it on the server too (used for SMS and notifications). Not critical if offline.
    if (useAuth.getState().status === 'signedIn') {
      void api('/me', { method: 'PATCH', body: { language } }).catch(() => undefined);
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Screen title={t('language.title')} subtitle={t('language.subtitle')}>
      {LANGUAGES.map((language) => (
        <BigButton
          key={language}
          label={LANGUAGE_NATIVE_NAMES[language]}
          variant="outline"
          selected={language === selected}
          accessibilityHint={language === selected ? t('language.selected') : undefined}
          onPress={() => void onSelect(language)}
        />
      ))}
    </Screen>
  );
}
