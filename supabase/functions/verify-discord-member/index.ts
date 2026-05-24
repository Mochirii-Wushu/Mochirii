import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

type VerificationResponse = {
  verified: boolean;
  hasGuildMembership: boolean;
  hasRequiredRoles: boolean;
  pending: boolean;
  missingRoleIds: string[];
  memberStatus: string;
  message: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DISCORD_API_BASE = "https://discord.com/api/v10";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const EXPECTED_REQUIRED_ROLE_IDS = ["1468659807736299520", "1078630751077142615"];
const LOCKED_STATUSES = new Set(["suspended", "archived"]);

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function parseCsv(value: string | null | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function defaultDisplayName(user: JsonRecord): string {
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

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function getServiceRoleKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return "";

  try {
    const parsed = JSON.parse(secretKeys);
    return String(parsed.default || parsed.service_role || "");
  } catch {
    return "";
  }
}

function resolveDiscordIdentity(user: JsonRecord, profile: JsonRecord | null): string | null {
  const identities = Array.isArray(user.identities) ? user.identities : [];

  for (const identity of identities) {
    const record = asRecord(identity);
    if (record.provider !== "discord") continue;

    const identityData = asRecord(record.identity_data);
    const id = safeString(
      record.provider_id ||
        identityData.provider_id ||
        identityData.sub ||
        identityData.id ||
        identityData.user_id,
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

function discordAvatarUrl(discordUser: JsonRecord): string | null {
  const id = safeString(discordUser.id, 40);
  const avatar = safeString(discordUser.avatar, 120);
  if (!id || !avatar) return null;

  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(id)}/${encodeURIComponent(avatar)}.${extension}`;
}

function verificationBody(input: VerificationResponse): VerificationResponse {
  return input;
}

async function updateProfile(
  adminClient: SupabaseClient,
  userId: string,
  payload: JsonRecord,
): Promise<JsonRecord | null> {
  const { data, error } = await adminClient
    .from("member_profiles")
    .upsert(
      {
        id: userId,
        ...payload,
      },
      { onConflict: "id" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("verify-discord-member profile update failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Unable to update member profile.");
  }

  return data as JsonRecord | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();
  const configuredGuildId = Deno.env.get("DISCORD_GUILD_ID") || "";
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN") || "";
  const configuredRequiredRoleIds = parseCsv(Deno.env.get("DISCORD_REQUIRED_ROLE_IDS"));
  const requiredRoleNames = parseCsv(Deno.env.get("DISCORD_REQUIRED_ROLE_NAMES"));
  const guildConfigMatches = configuredGuildId === EXPECTED_DISCORD_GUILD_ID;
  const roleConfigMatches =
    configuredRequiredRoleIds.length === EXPECTED_REQUIRED_ROLE_IDS.length &&
    EXPECTED_REQUIRED_ROLE_IDS.every((roleId) => configuredRequiredRoleIds.includes(roleId));
  const guildId = EXPECTED_DISCORD_GUILD_ID;
  const requiredRoleIds = EXPECTED_REQUIRED_ROLE_IDS;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !configuredGuildId ||
    !botToken ||
    !guildConfigMatches ||
    !roleConfigMatches ||
    requiredRoleNames.length === 0
  ) {
    console.error("verify-discord-member missing required server configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasGuildId: Boolean(configuredGuildId),
      hasBotToken: Boolean(botToken),
      guildConfigMatches,
      roleConfigMatches,
      configuredRoleCount: configuredRequiredRoleIds.length,
      requiredRoleNameCount: requiredRoleNames.length,
    });

    return jsonResponse(
      verificationBody({
        verified: false,
        hasGuildMembership: false,
        hasRequiredRoles: false,
        pending: false,
        missingRoleIds: requiredRoleIds,
        memberStatus: "pending",
        message: "Discord verification is not configured yet. Please contact leadership.",
      }),
      500,
    );
  }

  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return jsonResponse(
      verificationBody({
        verified: false,
        hasGuildMembership: false,
        hasRequiredRoles: false,
        pending: false,
        missingRoleIds: requiredRoleIds,
        memberStatus: "pending",
        message: "Sign in before checking Discord verification.",
      }),
      401,
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  const user = userData?.user as unknown as JsonRecord | undefined;

  if (userError || !user?.id) {
    console.warn("verify-discord-member invalid user JWT", {
      message: userError?.message || "Missing user",
    });

    return jsonResponse(
      verificationBody({
        verified: false,
        hasGuildMembership: false,
        hasRequiredRoles: false,
        pending: false,
        missingRoleIds: requiredRoleIds,
        memberStatus: "pending",
        message: "Your sign-in session could not be verified. Please sign in again.",
      }),
      401,
    );
  }

  const userId = String(user.id);
  const { data: profileData, error: profileError } = await adminClient
    .from("member_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("verify-discord-member profile lookup failed", {
      code: profileError.code,
      message: profileError.message,
    });
  }

  const profile = profileData as JsonRecord | null;
  const currentStatus = safeString(profile?.member_status, 40) || "pending";
  const lockedStatus = LOCKED_STATUSES.has(currentStatus);
  const discordUserId = resolveDiscordIdentity(user, profile);
  const now = new Date().toISOString();

  if (!discordUserId) {
    const updated = await updateProfile(adminClient, userId, {
      display_name: safeString(profile?.display_name, 40) || defaultDisplayName(user),
      has_required_discord_roles: false,
      discord_checked_at: now,
      discord_verified_at: null,
      member_status: lockedStatus ? currentStatus : "pending",
    });

    const memberStatus = safeString(updated?.member_status, 40) || "pending";
    return jsonResponse(
      verificationBody({
        verified: false,
        hasGuildMembership: false,
        hasRequiredRoles: false,
        pending: false,
        missingRoleIds: requiredRoleIds,
        memberStatus,
        message: "Discord identity was not found on this account. Sign in with Discord and try again.",
      }),
    );
  }

  const discordResponse = await fetch(
    `${DISCORD_API_BASE}/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(discordUserId)}`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
        Accept: "application/json",
      },
    },
  );

  if (discordResponse.status === 429) {
    const retryAfter = discordResponse.headers.get("retry-after");
    console.warn("verify-discord-member Discord rate limited", {
      retryAfter,
    });

    return jsonResponse(
      verificationBody({
        verified: false,
        hasGuildMembership: false,
        hasRequiredRoles: false,
        pending: false,
        missingRoleIds: requiredRoleIds,
        memberStatus: currentStatus,
        message: retryAfter
          ? `Discord verification is rate limited. Try again in ${retryAfter} seconds.`
          : "Discord verification is rate limited. Please try again soon.",
      }),
      429,
    );
  }

  if (discordResponse.status === 404) {
    const updated = await updateProfile(adminClient, userId, {
      discord_user_id: discordUserId,
      display_name: safeString(profile?.display_name, 40) || defaultDisplayName(user),
      has_required_discord_roles: false,
      discord_roles: [],
      discord_member_pending: null,
      discord_checked_at: now,
      discord_verified_at: null,
      member_status: lockedStatus ? currentStatus : "pending",
    });

    const memberStatus = safeString(updated?.member_status, 40) || "pending";
    return jsonResponse(
      verificationBody({
        verified: false,
        hasGuildMembership: false,
        hasRequiredRoles: false,
        pending: false,
        missingRoleIds: requiredRoleIds,
        memberStatus,
        message: "Join the Discord server, complete onboarding, and ask leadership for the required roles.",
      }),
    );
  }

  if (discordResponse.status === 401 || discordResponse.status === 403) {
    console.error("verify-discord-member Discord bot permission/configuration error", {
      status: discordResponse.status,
    });

    const updated = await updateProfile(adminClient, userId, {
      discord_user_id: discordUserId,
      display_name: safeString(profile?.display_name, 40) || defaultDisplayName(user),
      has_required_discord_roles: false,
      discord_checked_at: now,
      discord_verified_at: null,
      member_status: lockedStatus ? currentStatus : "pending",
    });

    const memberStatus = safeString(updated?.member_status, 40) || "pending";
    return jsonResponse(
      verificationBody({
        verified: false,
        hasGuildMembership: false,
        hasRequiredRoles: false,
        pending: false,
        missingRoleIds: requiredRoleIds,
        memberStatus,
        message: "Discord verification is not available yet. Please contact leadership.",
      }),
      502,
    );
  }

  if (!discordResponse.ok) {
    console.error("verify-discord-member Discord lookup failed", {
      status: discordResponse.status,
      statusText: discordResponse.statusText,
    });

    return jsonResponse(
      verificationBody({
        verified: false,
        hasGuildMembership: false,
        hasRequiredRoles: false,
        pending: false,
        missingRoleIds: requiredRoleIds,
        memberStatus: currentStatus,
        message: "Discord verification could not be completed. Please try again later.",
      }),
      502,
    );
  }

  const member = await discordResponse.json() as JsonRecord;
  const discordUser = asRecord(member.user);
  const roles = asStringArray(member.roles);
  const roleSet = new Set(roles);
  const missingRoleIds = requiredRoleIds.filter((roleId) => !roleSet.has(roleId));
  const pending = member.pending === true;
  const hasGuildMembership = true;
  const hasRequiredRoles = missingRoleIds.length === 0;
  const eligibleStatus = hasGuildMembership && hasRequiredRoles && !pending;
  const nextStatus = lockedStatus ? currentStatus : eligibleStatus ? "active" : "pending";
  const discordUsername = safeString(discordUser.username, 80);
  const discordGlobalName = safeString(discordUser.global_name, 100);
  const discordAvatar = discordAvatarUrl(discordUser);

  const updatedProfile = await updateProfile(adminClient, userId, {
    discord_user_id: discordUserId,
    discord_username: discordUsername,
    discord_global_name: discordGlobalName,
    discord_avatar_url: discordAvatar,
    discord_roles: roles,
    discord_member_pending: pending,
    has_required_discord_roles: hasRequiredRoles,
    discord_checked_at: now,
    discord_verified_at: eligibleStatus ? now : null,
    member_status: nextStatus,
    display_name: safeString(profile?.display_name, 40) || discordGlobalName || discordUsername || defaultDisplayName(user),
    avatar_url: safeString(profile?.avatar_url, 500) || discordAvatar,
    discord_handle: safeString(profile?.discord_handle, 80) || discordUsername,
  });

  const memberStatus = safeString(updatedProfile?.member_status, 40) || nextStatus;
  const verified = eligibleStatus && memberStatus === "active";
  const missingNames = missingRoleIds.map((roleId) => {
    const index = requiredRoleIds.indexOf(roleId);
    return requiredRoleNames[index] || roleId;
  });

  let message = "Discord membership verified. Gallery uploads are available.";
  if (lockedStatus) {
    message = "Discord roles were found, but this website account is not active. Please contact leadership.";
  } else if (pending) {
    message = "Complete Discord server onboarding before gallery uploads are available.";
  } else if (!hasRequiredRoles) {
    message = missingNames.length
      ? `Missing required Discord role${missingNames.length === 1 ? "" : "s"}: ${missingNames.join(", ")}.`
      : "Missing required Discord roles.";
  }

  return jsonResponse(
    verificationBody({
      verified,
      hasGuildMembership,
      hasRequiredRoles,
      pending,
      missingRoleIds,
      memberStatus,
      message,
    }),
  );
});
