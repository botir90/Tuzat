import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANGUAGES, type Language } from '@usta/shared';
import { api } from '@/api/client';
import { useAuth } from '@/auth/store';
import { AppText } from '@/components/AppText';
import { LanguageOption } from '@/components/LanguageOption';
import { ScreenHeader } from '@/components/ScreenHeader';
import { changeLanguage, currentLanguage } from '@/i18n';
import { LANGUAGE_NATIVE_NAMES } from '@/i18n/resources';
import { colors, spacing } from '@/theme';

/** Change the language later (from Settings). Same rows as the welcome screen. */
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScreenHeader title={t('language.title')} />
        <AppText color="textSecondary">{t('language.subtitle')}</AppText>
        <View style={styles.list} accessibilityRole="radiogroup">
          {LANGUAGES.map((language) => (
            <LanguageOption
              key={language}
              label={LANGUAGE_NATIVE_NAMES[language]}
              selected={language === selected}
              onPress={() => void onSelect(language)}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg },
  list: { gap: spacing.md, marginTop: spacing.sm },
});
