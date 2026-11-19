import { useInfiniteQuery } from '@tanstack/react-query';
import type { AdminPage } from '@usta/shared';
import { adminApi } from './api';

/**
 * Loads a cursor-paged admin list. `params` are extra query parameters (filters).
 * Returns all loaded rows plus a "load more" function.
 */
export function usePaged<T>(path: string, params: Record<string, string | undefined>) {
  const query = useInfiniteQuery({
    queryKey: [path, params],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries({ ...params, cursor: pageParam })) {
        if (value) search.set(key, value);
      }
      return adminApi<AdminPage<T>>(`${path}?${search.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  return {
    ...query,
    rows: query.data?.pages.flatMap((p) => p.items) ?? [],
  };
}
