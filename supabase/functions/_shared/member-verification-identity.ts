export type JsonRecord = Record<string, unknown>;

export type SyncedProviderIdentity = {
  provider: string;
  provider_subject: string | null;
  active: boolean;
};

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

export function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function defaultDisplayName(user: JsonRecord): string {
  const metadata = asRecord(user.user_metadata);
  const email = safeString(user.email, 120);
  const emailPrefix = email?.split("@")[0];
  const display = safeString(
    metadata.global_name ||
      metadata.full_name ||
      metadata.name ||
      metadata.preferred_username ||
      metadata.user_name ||
      metadata.username ||
      emailPrefix ||
      "Mōchirīī Member",
    40,
  );

  return display && display.length >= 2 ? display : "Mōchirīī Member";
}

export function providerSubject(
  provider: string,
  identity: JsonRecord,
  identityData: JsonRecord,
  user: JsonRecord,
): string | null {
  if (provider === "phone") {
    return safeString(
      identity.provider_id || identityData.provider_id || identityData.sub ||
        user.phone,
      255,
    );
  }

  return safeString(
    identity.provider_id ||
      identityData.provider_id ||
      identityData.sub ||
      identityData.id ||
      identityData.user_id,
    255,
  );
}

export function resolveDiscordIdentity(
  user: JsonRecord,
  syncedIdentities: readonly SyncedProviderIdentity[] = [],
): string | null {
  const trustedIds = new Set<string>();

  for (const identity of syncedIdentities) {
    if (identity.provider !== "discord" || identity.active !== true) continue;
    const id = safeString(identity.provider_subject, 40);
    if (id) trustedIds.add(id);
  }

  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const identity of identities) {
    const record = asRecord(identity);
    if (record.provider !== "discord") continue;

    const identityData = asRecord(record.identity_data);
    const id = safeString(
      providerSubject("discord", record, identityData, user),
      40,
    );
    if (id) trustedIds.add(id);
  }

  return trustedIds.size === 1 ? [...trustedIds][0] : null;
}

export function profileMatchesTrustedDiscordIdentity(
  profileDiscordUserId: unknown,
  trustedDiscordUserId: unknown,
): boolean {
  const profileId = safeString(profileDiscordUserId, 40);
  const trustedId = safeString(trustedDiscordUserId, 40);
  return Boolean(profileId && trustedId && profileId === trustedId);
}

export function discordAvatarUrl(discordUser: JsonRecord): string | null {
  const id = safeString(discordUser.id, 40);
  const avatar = safeString(discordUser.avatar, 120);
  if (!id || !avatar) return null;

  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(id)}/${
    encodeURIComponent(avatar)
  }.${extension}`;
}
