import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatSum } from '@usta/shared';
import { errorMessage } from '@/api/errors';
import { useFeed, useMasterProfile, useSetAvailability } from '@/api/master';
import { useAuth } from '@/auth/store';
import { BigButton } from '@/components/BigButton';
import { ListItem } from '@/components/ListItem';
import { Notice } from '@/components/Notice';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { ToggleRow } from '@/components/ToggleRow';
import { useLocalized } from '@/i18n/useLocalized';
import { describeDesiredTime, shortDescription } from '@/requests/describe';
import { spacing } from '@/theme';

/** Master home: verification status, "accepting orders" switch and the orders feed. */
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

  const footer = (
    <>
      <BigButton label={t('jobs.myJobs')} onPress={() => router.push('/jobs')} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <BigButton
            label={t('master.myOffers')}
            variant="outline"
            onPress={() => router.push('/master/offers')}
          />
        </View>
        <View style={styles.flex}>
          <BigButton
            label={t('common.settings')}
            variant="outline"
            onPress={() => router.push('/settings')}
          />
        </View>
      </View>
    </>
  );

  if (!data) {
    return (
      <Screen title={t('master.title')} footer={footer}>
        <QueryState
          isLoading={profile.isLoading}
          error={profile.error}
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen title={t('master.title')} footer={footer}>
      {data.verificationStatus === 'PENDING' ? (
        <Notice tone="warning" text={t('master.pending')} />
      ) : null}
      {data.verificationStatus === 'REJECTED' ? (
        <Notice tone="error" text={t('master.rejected', { reason: data.rejectionReason ?? '—' })} />
      ) : null}
      {/* Always editable: masters add districts or categories over time. */}
      <BigButton
        label={t('master.editProfile')}
        variant="outline"
        onPress={() => router.push('/master/onboarding')}
      />

      {data.verificationStatus === 'VERIFIED' ? (
        <>
          <ToggleRow
            label={t('master.accepting')}
            hint={data.isAvailable ? t('master.acceptingOn') : t('master.acceptingOff')}
            value={data.isAvailable}
            disabled={setAvailability.isPending}
            onChange={(value) => setAvailability.mutate(value)}
          />
          {setAvailability.isError ? (
            <Notice tone="error" text={errorMessage(t, setAvailability.error)} />
          ) : null}
        </>
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
            <ListItem
              key={item.id}
              title={`${localized(item.category.name)} · ${localized(item.district.name)}`}
              subtitle={[
                shortDescription(t, item),
                describeDesiredTime(t, item),
                item.priceRange
                  ? t('catalog.priceRange', {
                      min: formatSum(item.priceRange.min),
                      max: formatSum(item.priceRange.max),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join('\n')}
              badge={item.myOffer ? t(`offerStatus.${item.myOffer.status}`) : undefined}
              onPress={() =>
                router.push({ pathname: '/master/request/[id]', params: { id: item.id } })
              }
            />
          ))}
          {feed.data ? (
            <BigButton
              label={t('common.refresh')}
              variant="outline"
              loading={feed.isFetching}
              onPress={() => void feed.refetch()}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
