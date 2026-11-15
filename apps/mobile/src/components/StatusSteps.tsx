import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import type { JobStatus } from '@usta/shared';
import { colors, fontSize, spacing } from '@/theme';

const STEPS: JobStatus[] = ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'DONE'];

/** Accepted → On the way → Working → Done, with the current step highlighted. */
export function StatusSteps({ status }: { status: JobStatus }) {
  const { t } = useTranslation();
  const current = STEPS.indexOf(status);
  return (
    <View
      style={styles.list}
      accessibilityRole="progressbar"
      accessibilityLabel={t(`jobStatus.${status}`)}
    >
      {STEPS.map((step, index) => {
        const done = current >= index;
        const active = current === index;
        return (
          <View key={step} style={styles.row}>
            <MaterialCommunityIcons
              name={done ? 'check-circle' : 'circle-outline'}
              size={28}
              color={done ? colors.primary : colors.border}
            />
            <Text style={[styles.text, done && styles.textDone, active && styles.textActive]}>
              {t(`jobStatus.${step}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { fontSize: fontSize.body, color: colors.textMuted },
  textDone: { color: colors.text },
  textActive: { fontWeight: '700' },
});
