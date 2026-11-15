import { useDistricts, useRegions } from '@/api/catalog';
import { useLocalized } from '@/i18n/useLocalized';
import { useLocation } from './store';

/** "Xorazm viloyati, Urganch shahri" for the chosen location, or null if none. */
export function useLocationLabel(): { label: string | null; regionActive: boolean | null } {
  const localized = useLocalized();
  const { regionId, districtId } = useLocation();
  const regions = useRegions();
  const districts = useDistricts(regionId);

  const region = regions.data?.find((r) => r.id === regionId);
  const district = districts.data?.find((d) => d.id === districtId);
  if (!region || !district) return { label: null, regionActive: region?.isActive ?? null };
  return {
    label: `${localized(district.name)}, ${localized(region.name)}`,
    regionActive: region.isActive,
  };
}
