import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, shadow, spacing } from '@/theme';
import { AppText } from './AppText';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Default: go back (or home when there is nothing to go back to). */
  onBack?: () => void;
  /** Hide the back button (first screen of a flow). */
  hideBack?: boolean;
}

/** 44×44 round white back button + title (20/800) + optional subtitle. */
export function ScreenHeader({ title, subtitle, onBack, hideBack }: ScreenHeaderProps) {
  const { t } = useTranslation();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={styles.row}>
      {hideBack ? null : (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={4}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={2.2} />
        </Pressable>
      )}
      <View style={styles.texts}>
        <AppText variant="h2" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  pressed: { backgroundColor: colors.primarySoft },
  texts: { flex: 1, gap: 2 },
});
