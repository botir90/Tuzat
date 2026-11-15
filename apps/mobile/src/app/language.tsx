import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANGUAGES, type Language } from '@usta/shared';
import { BigButton } from '@/components/BigButton';
import { changeLanguage, currentLanguage } from '@/i18n';
import { LANGUAGE_NATIVE_NAMES } from '@/i18n/resources';
import { colors, fontSize, spacing } from '@/theme';

export default function LanguageScreen() {
  // useTranslation re-renders this screen when the language changes.
  const { t } = useTranslation();
  const selected = currentLanguage();

  async function onSelect(language: Language) {
    await changeLanguage(language);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {t('language.title')}
      </Text>
      <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
      <View style={styles.list}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: {
    fontSize: fontSize.title,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xl,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 26,
  },
  list: { marginTop: spacing.xl, gap: spacing.md },
});
