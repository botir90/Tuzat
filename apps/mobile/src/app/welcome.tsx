import { router } from 'expo-router';
import { Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME, LANGUAGES, type Language, type SelectableRole } from '@usta/shared';
import { useAuth } from '@/auth/store';
import { AppText } from '@/components/AppText';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { LanguageOption } from '@/components/LanguageOption';
import { changeLanguage, currentLanguage } from '@/i18n';
import { LANGUAGE_NATIVE_NAMES } from '@/i18n/resources';
import { colors, fonts, spacing } from '@/theme';

/**
 * First screen (design/screens/Main.html): logo, language, then
 * "I need a master" / "I am a master".
 */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const setMode = useAuth((s) => s.setMode);
  const [selected, setSelected] = useState<Language>(currentLanguage());
  const [busy, setBusy] = useState<SelectableRole | null>(null);

  function pickLanguage(language: Language) {
    setSelected(language);
    // The whole screen switches language immediately.
    void changeLanguage(language);
  }

  async function choose(mode: SelectableRole) {
    setBusy(mode);
    try {
      // Remember the language even if the user never tapped one (the phone's language).
      await changeLanguage(selected);
      await setMode(mode);
      router.replace('/');
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.logo} accessibilityElementsHidden importantForAccessibility="no">
            <Wrench size={48} color={colors.onPrimary} strokeWidth={1.8} />
          </View>
          <AppText variant="display" style={styles.appName} accessibilityRole="header">
            {APP_NAME}
          </AppText>
          <AppText color="textSecondary" align="center" style={styles.tagline}>
            {t('welcome.tagline')}
          </AppText>
        </View>

        {/* Shown in all three languages at once: the user may not read the current one. */}
        <AppText variant="label" color="textSecondary" style={styles.prompt}>
          Tilni tanlang / Тилни танланг / Выберите язык
        </AppText>
        <View style={styles.languages} accessibilityRole="radiogroup">
          {LANGUAGES.map((language) => (
            <LanguageOption
              key={language}
              label={LANGUAGE_NATIVE_NAMES[language]}
              selected={language === selected}
              onPress={() => pickLanguage(language)}
            />
          ))}
        </View>

        <View style={styles.spacer} />

        <View style={styles.actions}>
          <PrimaryButton
            label={t('welcome.customer')}
            accessibilityHint={t('welcome.customerHint')}
            loading={busy === 'CUSTOMER'}
            disabled={busy !== null}
            onPress={() => void choose('CUSTOMER')}
          />
          <SecondaryButton
            tall
            label={t('welcome.master')}
            accessibilityHint={t('welcome.masterHint')}
            loading={busy === 'MASTER'}
            disabled={busy !== null}
            onPress={() => void choose('MASTER')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    paddingTop: 72,
    paddingHorizontal: spacing.xxl,
    paddingBottom: 40,
  },
  brand: { alignItems: 'center', gap: spacing.lg },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 30, letterSpacing: -0.5 },
  tagline: { fontSize: 17, lineHeight: 25, maxWidth: 300 },
  prompt: { marginTop: 56, fontFamily: fonts.semibold },
  languages: { marginTop: spacing.lg, gap: spacing.md },
  spacer: { flexGrow: 1, minHeight: spacing.xxl },
  actions: { gap: spacing.md },
});
