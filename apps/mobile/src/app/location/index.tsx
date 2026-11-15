import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRegions } from '@/api/catalog';
import { ListItem } from '@/components/ListItem';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from '@/location/store';

/** Step 1 of choosing the location: the region. */
export default function RegionScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const regions = useRegions();
  const currentRegionId = useLocation((s) => s.regionId);

  // Launched regions first, so most people find theirs at the top.
  const sorted = regions.data
    ? [...regions.data].sort((a, b) => Number(b.isActive) - Number(a.isActive))
    : [];

  return (
    <Screen title={t('location.regionTitle')} subtitle={t('location.regionSubtitle')}>
      <QueryState
        isLoading={regions.isLoading}
        error={regions.error}
        onRetry={() => void regions.refetch()}
      />
      {sorted.map((region) => (
        <ListItem
          key={region.id}
          title={localized(region.name)}
          badge={region.isActive ? t('location.available') : undefined}
          selected={region.id === currentRegionId}
          onPress={() =>
            router.push({ pathname: '/location/[regionId]', params: { regionId: region.id } })
          }
        />
      ))}
    </Screen>
  );
}
