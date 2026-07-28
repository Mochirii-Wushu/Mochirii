export function isRecentPastTimestamp(
  value: string | null | undefined,
  maxAgeMs: number,
  now = Date.now(),
) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time <= now && now - time <= maxAgeMs;
}
