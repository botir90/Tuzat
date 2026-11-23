import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '@/api/errors';
import { useFeed, useMasterProfile, useSetAvailability } from '@/api/master';
import { useAuth } from '@/auth/store';
import { AppText } from '@/components/AppText';
import { SecondaryButton } from '@/components/buttons';
import { FeedCard } from '@/components/FeedCard';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { TabBar } from '@/components/TabBar';
import { useLocalized } from '@/i18n/useLocalized';
import { colors, radius, spacing } from '@/theme';

/**
 * Master home (design/screens/MasterFeed.html): "accepting orders" switch with the
 * master's trades and districts, then new matching requests. Pull down to refresh.
 */
export default function MasterHome() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const status = useAuth((s) => s.status);
  const profile = useMasterProfile();
  const setAvailability = useSetAvailability();
  const data = profile.data;
  const canWork = data?.verificationStatus === 'VERIFIED' && data.isAvailable;
  const feed = useFeed(Boolean(canWork));

  // Masters always need an account (e.g. after the session expired).
  if (status !== 'signedIn') return <Redirect href="/login" />;
  if (data === null) return <Redirect href="/master/onboarding" />;

  const scope = data
    ? [
        data.categories.map((c) => localized(c.name)).join(', '),
        data.districts.map((d) => localized(d.name)).join(', '),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => void Promise.all([feed.refetch(), profile.refetch()])}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.titleRow}>
          <AppText variant="h1" accessibilityRole="header">
            {t('master.feedTitle')}
          </AppText>
          <Pressable
            onPress={() => router.push('/master/offers')}
            accessibilityRole="link"
            hitSlop={12}
          >
            <AppText variant="label" color="primary">
              {t('master.myOffers')}
            </AppText>
          </Pressable>
        </View>

        <QueryState
          isLoading={profile.isLoading}
          error={profile.error}
          onRetry={() => void profile.refetch()}
        />

        {data?.verificationStatus === 'PENDING' ? (
          <Notice tone="warning" text={t('master.pending')} />
        ) : null}
        {data?.verificationStatus === 'REJECTED' ? (
          <Notice
            tone="error"
            text={t('master.rejected', { reason: data.rejectionReason ?? '—' })}
          />
        ) : null}

        {data?.verificationStatus === 'VERIFIED' ? (
          <View style={styles.availability}>
            <View style={styles.flex}>
              <AppText variant="label">{t('master.accepting')}</AppText>
              <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                {data.isAvailable ? scope : t('master.acceptingOff')}
              </AppText>
            </View>
            <Switch
              value={data.isAvailable}
              disabled={setAvailability.isPending}
              onValueChange={(value) => setAvailability.mutate(value)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
              accessibilityLabel={t('master.accepting')}
            />
          </View>
        ) : null}
        {setAvailability.isError ? (
          <Notice tone="error" text={errorMessage(t, setAvailability.error)} />
        ) : null}

        {canWork ? (
          <>
            <QueryState
              isLoading={feed.isLoading}
              error={feed.error}
              onRetry={() => void feed.refetch()}
            />
            {feed.data?.length === 0 ? <Notice text={t('master.feedEmpty')} /> : null}
            {feed.data?.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                onOpen={() =>
                  router.push({ pathname: '/master/request/[id]', params: { id: item.id } })
                }
              />
            ))}
          </>
        ) : null}

        {data ? (
          <SecondaryButton
            tone="warm"
            label={t('master.editProfile')}
            onPress={() => router.push('/master/onboarding')}
          />
        ) : null}
      </ScrollView>
      <TabBar active="feed" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 32, gap: spacing.md },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  availability: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: { flex: 1, gap: 2 },
});
