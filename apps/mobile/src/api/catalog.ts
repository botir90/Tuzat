import { useQuery } from '@tanstack/react-query';
import type {
  AvailabilityDto,
  CategoryDto,
  CategoryGroupDto,
  PopularService,
  TopMaster,
  DistrictDto,
  PriceItemDto,
  RegionDto,
} from '@usta/shared';
import { api } from './client';

// The catalog rarely changes, so we keep it for 1 hour before asking the server again.
const CATALOG_STALE_MS = 60 * 60 * 1000;

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: () => api<RegionDto[]>('/regions', { auth: false }),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useDistricts(regionId: string | null) {
  return useQuery({
    queryKey: ['districts', regionId],
    queryFn: () => api<DistrictDto[]>(`/regions/${regionId}/districts`, { auth: false }),
    enabled: regionId !== null,
    staleTime: CATALOG_STALE_MS,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<CategoryDto[]>('/categories', { auth: false }),
    staleTime: CATALOG_STALE_MS,
  });
}

export function usePrices(categoryId: string, regionId: string | null) {
  const query = regionId ? `?regionId=${encodeURIComponent(regionId)}` : '';
  return useQuery({
    queryKey: ['prices', categoryId, regionId],
    queryFn: () => api<PriceItemDto[]>(`/categories/${categoryId}/prices${query}`, { auth: false }),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useAvailability(districtId: string | null, categoryId?: string) {
  const params = new URLSearchParams();
  if (districtId) params.set('districtId', districtId);
  if (categoryId) params.set('categoryId', categoryId);
  return useQuery({
    queryKey: ['availability', districtId, categoryId],
    queryFn: () => api<AvailabilityDto>(`/availability?${params.toString()}`, { auth: false }),
    enabled: districtId !== null,
  });
}

export function useCategoryGroups() {
  return useQuery({
    queryKey: ['category-groups'],
    queryFn: () => api<CategoryGroupDto[]>('/category-groups', { auth: false }),
    staleTime: CATALOG_STALE_MS,
  });
}

export function usePopularServices(regionId: string | null) {
  const query = regionId ? `?regionId=${encodeURIComponent(regionId)}` : '';
  return useQuery({
    queryKey: ['popular', regionId],
    queryFn: () => api<PopularService[]>(`/catalog/popular${query}`, { auth: false }),
    staleTime: CATALOG_STALE_MS,
  });
}

/** Ratings change after every job, so this list is refreshed more often than the catalog. */
export function useTopMasters(regionId: string | null) {
  const query = regionId ? `?regionId=${encodeURIComponent(regionId)}` : '';
  return useQuery({
    queryKey: ['top-masters', regionId],
    queryFn: () => api<TopMaster[]>(`/masters/top${query}`, { auth: false }),
    staleTime: 5 * 60_000,
  });
}
