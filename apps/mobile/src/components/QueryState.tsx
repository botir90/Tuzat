import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/api/errors';
import { colors, fontSize, spacing } from '@/theme';
import { BigButton } from './BigButton';
import { Notice } from './Notice';

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/**
 * Loading spinner or error message with a "Retry" button.
 * Returns null when data is ready, so screens can write:
 *   if (!data) return <QueryState ... />
 */
export function QueryState({ isLoading, error, onRetry }: QueryStateProps) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <View style={styles.center} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>{t('common.loading')}</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.gap}>
        <Notice tone="error" text={errorMessage(t, error)} />
        <BigButton label={t('common.retry')} variant="outline" onPress={onRetry} />
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  text: { fontSize: fontSize.body, color: colors.textMuted },
  gap: { gap: spacing.md },
});
