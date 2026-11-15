/** Simple visit slots instead of a date-time picker: big buttons are easier for everyone. */
export const SLOT_HOURS = [9, 12, 15, 18] as const;
export const DAY_OFFSETS = [1, 2, 3] as const;

/** Date at `hour`:00 local time, `dayOffset` days from today. Returned as ISO string. */
export function slotToIso(dayOffset: number, hour: number, now = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** "15.11 15:00" in the phone's local time. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
