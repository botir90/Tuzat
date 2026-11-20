import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { ScreenHeader } from './ScreenHeader';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned to the bottom (main action buttons). */
  footer?: ReactNode;
  /** Show the design's round back button next to the title. */
  back?: boolean;
}

/** Common screen layout: safe area, warm background, scrolling, keyboard handling, title. */
export function Screen({ title, subtitle, children, footer, back }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {title && back ? <ScreenHeader title={title} subtitle={subtitle} /> : null}
          {title && !back ? (
            <View style={styles.titles}>
              <AppText variant="h1" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="body" color="textSecondary">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          ) : null}
          <View style={styles.body}>{children}</View>
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: spacing.xl, flexGrow: 1 },
  titles: { gap: spacing.sm, marginTop: spacing.md },
  body: { marginTop: spacing.xl, gap: spacing.md, flexGrow: 1 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
});
