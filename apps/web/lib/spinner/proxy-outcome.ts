export type SpinnerProxyOutcome =
  | "access-denied"
  | "synchronized"
  | "not-modified"
  | "command-rejected"
  | "rate-limited"
  | "upstream-error";

export function spinnerProxyOutcomeForStatus(
  method: "GET" | "POST",
  status: number,
): SpinnerProxyOutcome | null {
  if (status === 200) return "synchronized";
  if (status === 429) return "rate-limited";
  if (method === "POST" && (status === 400 || status === 409)) {
    return "command-rejected";
  }
  return null;
}
