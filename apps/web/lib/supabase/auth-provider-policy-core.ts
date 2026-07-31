export function normalizeProviderPolicyIds(value: string | undefined) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveProviderPolicyIds<const T extends string>(
  value: string | undefined,
  supportedProviderIds: readonly T[],
) {
  const supported = new Set<string>(supportedProviderIds);
  return [...new Set(normalizeProviderPolicyIds(value))]
    .filter((providerId): providerId is T => supported.has(providerId));
}
