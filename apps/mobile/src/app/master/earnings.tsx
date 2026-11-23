import { router } from 'expo-router';
import { Info, Settings, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatSum } from '@usta/shared';
import { useMasterEarnings } from '@/api/master';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { TabBar } from '@/components/TabBar';
import { useLocalized } from '@/i18n/useLocalized';
import { relativeTime } from '@/requests/relativeTime';
import { colors, fonts, radius, spacing } from '@/theme';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const CHART_HEIGHT = 96;

/** Master earnings (design/screens/MasterEarnings.html): week chart, month, rating, recent jobs. */
export default function EarningsScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const earnings = useMasterEarnings();
  const data = earnings.data;
  const max = data ? Math.max(1, ...data.week.days) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={earnings.isRefetching}
            onRefresh={() => void earnings.refetch()}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.titleRow}>
          <AppText variant="h1" accessibilityRole="header">
            {t('earnings.title')}
          </AppText>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('common.settings')}
            style={styles.settings}
          >
            <Settings size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>

        <QueryState
          isLoading={earnings.isLoading}
          error={earnings.error}
          onRetry={() => void earnings.refetch()}
        />

        {data ? (
          <>
            {/* This week, with a bar per day */}
            <View style={styles.week}>
              <AppText variant="label" style={styles.weekLabel}>
                {t('earnings.thisWeek')}
              </AppText>
              <AppText variant="display" color="onPrimary">
                {formatSum(data.week.total)} {t('common.sum')}
              </AppText>
              <AppText style={styles.weekLabel}>
                {t('earnings.jobsDone', { count: data.week.jobs })}
              </AppText>
              <View
                style={styles.chart}
                accessibilityLabel={DAY_KEYS.map(
                  (d, i) => `${t(`earnings.days.${d}`)}: ${formatSum(data.week.days[i] ?? 0)}`,
                ).join(', ')}
              >
                {data.week.days.map((value, index) => (
                  <View key={DAY_KEYS[index]} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(4, (value / max) * CHART_HEIGHT),
                            backgroundColor:
                              index === data.week.todayIndex
                                ? colors.surface
                                : 'rgba(255,255,255,0.45)',
                          },
                        ]}
                      />
                    </View>
                    <AppText variant="tiny" style={styles.weekLabel}>
                      {t(`earnings.days.${DAY_KEYS[index]!}`)}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <Card style={styles.flex}>
                <AppText variant="caption" color="textSecondary">
                  {t('earnings.thisMonth')}
                </AppText>
                <AppText variant="h2">{formatSum(data.month.total)}</AppText>
              </Card>
              <Card style={styles.flex}>
                <AppText variant="caption" color="textSecondary">
                  {t('earnings.rating')}
                </AppText>
                <View style={styles.rating}>
                  <Star size={18} color={colors.star} fill={colors.starFill} strokeWidth={2} />
                  <AppText variant="h2">
                    {data.ratingCount > 0 ? data.ratingAvg.toFixed(1) : '—'}
                  </AppText>
                </View>
                <AppText variant="caption" color="textSecondary">
                  {t('earnings.reviews', { count: data.ratingCount })}
                </AppText>
              </Card>
            </View>

            <View style={styles.commission}>
              <Info size={22} color={colors.goldText} strokeWidth={2} />
              <AppText variant="caption" color="goldText" style={styles.flex}>
                {t('earnings.commissionNote')}
              </AppText>
            </View>

            <AppText variant="h3">{t('earnings.recent')}</AppText>
            {data.recent.length === 0 ? <Notice text={t('earnings.empty')} /> : null}
            {data.recent.length > 0 ? (
              <Card style={styles.list}>
                {data.recent.map((job, index) => {
                  const ago = relativeTime(job.doneAt);
                  return (
                    <Pressable
                      key={job.jobId}
                      onPress={() =>
                        router.push({ pathname: '/jobs/[id]', params: { id: job.jobId } })
                      }
                      accessibilityRole="button"
                      style={[styles.item, index > 0 && styles.divider]}
                    >
                      <View style={styles.flex}>
                        <AppText variant="label">{localized(job.categoryName)}</AppText>
                        <AppText variant="caption" color="textMuted">
                          {t(ago.key, { count: ago.count })}
                          {job.stars ? ` · ${t('earnings.stars', { count: job.stars })}` : ''}
                        </AppText>
                      </View>
                      <AppText variant="label" style={styles.extrabold}>
                        {formatSum(job.price)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <TabBar active="earnings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 32, gap: spacing.lg },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settings: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: {
    backgroundColor: colors.primary,
    borderRadius: radius.hero,
    padding: spacing.xl,
    gap: 4,
  },
  weekLabel: { color: colors.primarySoft },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { height: CHART_HEIGHT, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commission: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.goldSoft,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },
  list: { paddingVertical: spacing.xs, gap: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  extrabold: { fontFamily: fonts.extrabold },
});
