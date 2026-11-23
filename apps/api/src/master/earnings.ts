/**
 * Week/month boundaries in Uzbekistan time (UTC+5, no daylight saving),
 * so "this week" starts on Monday 00:00 in Tashkent, not in UTC.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 (Tashkent) of the week containing `now`, as a UTC Date. */
export function weekStart(now: Date): Date {
  const local = new Date(now.getTime() + OFFSET_MS);
  const dayIndex = (local.getUTCDay() + 6) % 7; // Monday = 0
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnight - dayIndex * DAY_MS - OFFSET_MS);
}

/** The 1st of the month 00:00 (Tashkent) containing `now`, as a UTC Date. */
export function monthStart(now: Date): Date {
  const local = new Date(now.getTime() + OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - OFFSET_MS);
}

/** 0 = Monday … 6 = Sunday, in Tashkent time. */
export function dayIndex(date: Date): number {
  return (new Date(date.getTime() + OFFSET_MS).getUTCDay() + 6) % 7;
}

/** Sums of `price` per weekday (Monday … Sunday) for jobs done since `start`. */
export function sumByDay(jobs: { doneAt: Date; price: number }[], start: Date): number[] {
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const job of jobs) {
    if (job.doneAt < start) continue;
    const index = Math.floor((job.doneAt.getTime() - start.getTime()) / DAY_MS);
    if (index >= 0 && index < 7) days[index]! += job.price;
  }
  return days;
}
