/** Hours (rounded up) until the automatic release; the real time comes from the API. */
export function hoursLeft(releaseDueAt: string | null, now: Date = new Date()): number | null {
  if (!releaseDueAt) return null;
  return Math.max(0, Math.ceil((new Date(releaseDueAt).getTime() - now.getTime()) / 3_600_000));
}
