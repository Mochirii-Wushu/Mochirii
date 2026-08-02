import { discordFetch, discordMemberRoleState } from "./discord-api.ts";
import { isDiscordUnknownMemberResponse } from "./discord-membership-response.ts";

export const SOCIAL_EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
export const SOCIAL_EXPECTED_REQUIRED_ROLE_IDS = [
  "1468659807736299520",
  "1078630751077142615",
] as const;
export const SOCIAL_DISCORD_REQUEST_TIMEOUT_MS = 5_000;

export type SocialDiscordMembershipResult =
  | { status: "verified" }
  | { status: "denied"; reason: "not_member" | "pending" | "missing_roles" }
  | {
    status: "unavailable";
    reason: "configuration" | "network" | "rate_limited" | "provider_response";
  };

function sameRequiredRoles(configuredRoleIds: string[]): boolean {
  return configuredRoleIds.length ===
      SOCIAL_EXPECTED_REQUIRED_ROLE_IDS.length &&
    SOCIAL_EXPECTED_REQUIRED_ROLE_IDS.every((roleId) =>
      configuredRoleIds.includes(roleId)
    );
}

export async function currentSocialDiscordMembership({
  discordUserId,
  configuredGuildId,
  configuredRequiredRoleIds,
  botToken,
  fetcher,
  timeoutMs = SOCIAL_DISCORD_REQUEST_TIMEOUT_MS,
}: {
  discordUserId: string;
  configuredGuildId: string;
  configuredRequiredRoleIds: string[];
  botToken: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}): Promise<SocialDiscordMembershipResult> {
  if (
    !/^\d{16,22}$/u.test(discordUserId) ||
    !botToken ||
    configuredGuildId !== SOCIAL_EXPECTED_DISCORD_GUILD_ID ||
    !sameRequiredRoles(configuredRequiredRoleIds)
  ) {
    return { status: "unavailable", reason: "configuration" };
  }

  let result;
  try {
    result = await discordFetch(
      `/guilds/${
        encodeURIComponent(SOCIAL_EXPECTED_DISCORD_GUILD_ID)
      }/members/${encodeURIComponent(discordUserId)}`,
      { token: botToken, fetcher, timeoutMs },
    );
  } catch {
    return { status: "unavailable", reason: "network" };
  }

  if (result.status === 429) {
    return { status: "unavailable", reason: "rate_limited" };
  }
  if (isDiscordUnknownMemberResponse(result)) {
    return { status: "denied", reason: "not_member" };
  }
  if (!result.ok) return { status: "unavailable", reason: "provider_response" };

  const roleState = discordMemberRoleState(result.data, discordUserId);
  if (!roleState) return { status: "unavailable", reason: "provider_response" };
  if (roleState.pending) return { status: "denied", reason: "pending" };

  const roleSet = new Set(roleState.roles);
  if (
    !SOCIAL_EXPECTED_REQUIRED_ROLE_IDS.every((roleId) => roleSet.has(roleId))
  ) {
    return { status: "denied", reason: "missing_roles" };
  }

  return { status: "verified" };
}
