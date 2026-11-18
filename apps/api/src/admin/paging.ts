import type { AdminPage } from '@usta/shared';

/**
 * Cursor paging (newest first). Ask the database for one extra row: if it comes back,
 * there is a next page and its cursor is the id of the last row we return.
 */
export function pageArgs(cursor: string | undefined, limit: number) {
  return {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
  };
}

export function toPage<T, R>(
  rows: T[],
  limit: number,
  map: (row: T) => R,
  id: (row: T) => string,
): AdminPage<R> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items: items.map(map),
    nextCursor: rows.length > limit && last ? id(last) : null,
  };
}
