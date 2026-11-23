import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { JobDto, JobStatus } from '@usta/shared';
import { formatTime } from '@/requests/schedule';
import { colors, fonts } from '@/theme';
import { AppText } from './AppText';
import { Card } from './Card';

type StepStatus = Exclude<JobStatus, 'CANCELLED'>;

const STEPS: { status: StepStatus; at: keyof JobDto }[] = [
  { status: 'ACCEPTED', at: 'acceptedAt' },
  { status: 'ON_THE_WAY', at: 'onTheWayAt' },
  { status: 'IN_PROGRESS', at: 'startedAt' },
  { status: 'DONE', at: 'doneAt' },
];

/**
 * Vertical job steps (design: StatusTimeline): done = filled teal with a check,
 * current = teal ring and bold, upcoming = gray. Each step shows its time.
 */
export function StatusTimeline({ job }: { job: JobDto }) {
  const { t } = useTranslation();
  const current = STEPS.findIndex((s) => s.status === job.status);
  return (
    <Card style={styles.card}>
      <View accessibilityRole="progressbar" accessibilityLabel={t(`jobStatus.${job.status}`)}>
        {STEPS.map((step, index) => {
          // The last reached step counts as done only when the job is DONE.
          const done = index < current || (job.status === 'DONE' && index === current);
          const now = index === current && !done;
          const at = job[step.at];
          const last = index === STEPS.length - 1;
          return (
            <View key={step.status} style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.dot, done && styles.dotDone, now && styles.dotNow]}>
                  {done ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
                </View>
                {last ? null : <View style={[styles.line, done && styles.lineDone]} />}
              </View>
              <View style={styles.texts}>
                <AppText
                  variant="bodyStrong"
                  color={now ? 'primary' : done ? 'text' : 'textMuted'}
                  style={now ? styles.now : done ? styles.done : styles.todo}
                >
                  {t(`timeline.${step.status}`)}
                </AppText>
                {typeof at === 'string' ? (
                  <AppText variant="caption" color="textMuted">
                    {formatTime(at)}
                  </AppText>
                ) : now ? (
                  <AppText variant="caption" color="textMuted">
                    {t('timeline.now')}
                  </AppText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18 },
  row: { flexDirection: 'row', gap: 14 },
  rail: { width: 24, alignItems: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B8C1BE',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotNow: { borderColor: colors.primary },
  line: { width: 2, flexGrow: 1, minHeight: 18, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.primary },
  texts: { flex: 1, paddingBottom: 14, gap: 2 },
  done: { fontFamily: fonts.semibold },
  now: { fontFamily: fonts.extrabold },
  todo: { fontFamily: fonts.regular },
});
