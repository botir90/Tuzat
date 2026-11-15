import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDistricts } from '@/api/catalog';
import { ListItem } from '@/components/ListItem';
import { QueryState } from '@/components/QueryState';
import { Screen } from '@/components/Screen';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from '@/location/store';

/** Step 2 of choosing the location: the district or city. */
export default function DistrictScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { regionId } = useLocalSearchParams<{ regionId: string }>();
  const districts = useDistricts(regionId);
  const { districtId: currentDistrictId, setLocation } = useLocation();

  async function choose(districtId: string) {
    await setLocation(regionId, districtId);
    // Close both location screens and return to where the user came from.
    router.dismiss(2);
  }

  return (
    <Screen title={t('location.districtTitle')}>
      <QueryState
        isLoading={districts.isLoading}
        error={districts.error}
        onRetry={() => void districts.refetch()}
      />
      {districts.data?.map((district) => (
        <ListItem
          key={district.id}
          title={localized(district.name)}
          selected={district.id === currentDistrictId}
          onPress={() => void choose(district.id)}
        />
      ))}
    </Screen>
  );
}
