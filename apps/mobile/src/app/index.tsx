import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME } from '@usta/shared';
import { BigButton } from '@/components/BigButton';
import { hasChosenLanguage } from '@/i18n';
import { colors, fontSize, spacing } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation();

  // First launch: ask for the language before anything else.
  if (!hasChosenLanguage()) return <Redirect href="/language" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.appName} accessibilityRole="header">
          {APP_NAME}
        </Text>
        <Text style={styles.title}>{t('home.welcome')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      </View>
      <BigButton
        label={t('home.changeLanguage')}
        variant="outline"
        onPress={() => router.push('/language')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  content: { flex: 1, justifyContent: 'center', gap: spacing.md },
  appName: { fontSize: fontSize.body, color: colors.primary, fontWeight: '700' },
  title: { fontSize: fontSize.title, color: colors.text, fontWeight: '700' },
  subtitle: { fontSize: fontSize.body, color: colors.textMuted, lineHeight: 26 },
});
