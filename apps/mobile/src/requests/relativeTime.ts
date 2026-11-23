/** How long ago something happened, as a translation key + count ("2 minutes ago"). */
export type RelativeTime =
  | { key: 'time.justNow'; count: 0 }
  | { key: 'time.minutesAgo' | 'time.hoursAgo' | 'time.daysAgo'; count: number };

export function relativeTime(iso: string, now: Date = new Date()): RelativeTime {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return { key: 'time.justNow', count: 0 };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { key: 'time.minutesAgo', count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: 'time.hoursAgo', count: hours };
  return { key: 'time.daysAgo', count: Math.floor(hours / 24) };
}
