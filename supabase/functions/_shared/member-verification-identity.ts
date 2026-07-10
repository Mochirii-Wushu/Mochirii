export type JsonRecord = Record<string, unknown>;

export type SyncedProviderIdentity = {
  provider: string;
  provider_subject: string | null;
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
      "Mochirii Member",
    40,
  );

  return display && display.length >= 2 ? display : "Mochirii Member";
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
  profile: JsonRecord | null,
  syncedIdentities: readonly SyncedProviderIdentity[] = [],
): string | null {
  const synced = syncedIdentities.find((identity) =>
    identity.provider === "discord"
  )?.provider_subject;
  const syncedId = safeString(synced, 40);
  if (syncedId) return syncedId;

  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const identity of identities) {
    const record = asRecord(identity);
    if (record.provider !== "discord") continue;

    const identityData = asRecord(record.identity_data);
    const id = safeString(
      providerSubject("discord", record, identityData, user),
      40,
    );
    if (id) return id;
  }

  const metadata = asRecord(user.user_metadata);
  return safeString(
    profile?.discord_user_id ||
      metadata.provider_id ||
      metadata.sub ||
      metadata.id ||
      metadata.user_id,
    40,
  );
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
