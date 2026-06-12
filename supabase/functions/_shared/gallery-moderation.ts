import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type JsonRecord = Record<string, unknown>;

type ModeratorAccessSuccess = {
  ok: true;
  adminClient: SupabaseClient;
  user: User;
  userId: string;
  discordUserId: string;
  roleIds: string[];
};

type ModeratorAccessFailure = {
  ok: false;
  response: Response;
};

export type ModeratorAccessResult = ModeratorAccessSuccess | ModeratorAccessFailure;

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DISCORD_API_BASE = "https://discord.com/api/v10";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const EXPECTED_MODERATOR_ROLE_IDS = ["1078630751165222984"];

export function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

export function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function parseCsv(value: string | null | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function readOptionalJsonBody(req: Request): Promise<{ ok: true; body: JsonRecord } | ModeratorAccessFailure> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: true, body: {} };
  }

  try {
    return { ok: true, body: asRecord(await req.json()) };
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          error: "invalid_json",
          message: "Request body must be valid JSON.",
        },
        400,
      ),
    };
  }
}

export async function readRequiredJsonBody(req: Request): Promise<{ ok: true; body: JsonRecord } | ModeratorAccessFailure> {
  try {
    return { ok: true, body: asRecord(await req.json()) };
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          error: "invalid_json",
          message: "Request body must be valid JSON.",
        },
        400,
      ),
    };
  }
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

function moderatorConfigMatches(configuredRoleIds: string[]): boolean {
  return (
    configuredRoleIds.length === EXPECTED_MODERATOR_ROLE_IDS.length &&
    EXPECTED_MODERATOR_ROLE_IDS.every((roleId) => configuredRoleIds.includes(roleId))
  );
}

export async function requireModeratorAccess(req: Request): Promise<ModeratorAccessResult> {
  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "missing_auth",
          message: "Sign in with Discord before opening gallery moderation.",
        },
        401,
      ),
    };
  }

  if (!looksLikeJwt(accessToken)) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "invalid_auth",
          message: "Your sign-in session could not be verified. Please sign in again.",
        },
        401,
      ),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();
  const configuredGuildId = Deno.env.get("DISCORD_GUILD_ID") || "";
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN") || "";
  const configuredModeratorRoleIds = parseCsv(Deno.env.get("DISCORD_MODERATOR_ROLE_IDS"));
  const moderatorRoleNames = parseCsv(Deno.env.get("DISCORD_MODERATOR_ROLE_NAMES"));
  const guildConfigMatches = configuredGuildId === EXPECTED_DISCORD_GUILD_ID;
  const roleConfigMatches = moderatorConfigMatches(configuredModeratorRoleIds);

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !configuredGuildId ||
    !botToken ||
    !guildConfigMatches ||
    !roleConfigMatches ||
    moderatorRoleNames.length === 0
  ) {
    console.error("gallery moderation missing required server configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasGuildId: Boolean(configuredGuildId),
      hasBotToken: Boolean(botToken),
      guildConfigMatches,
      roleConfigMatches,
      configuredModeratorRoleCount: configuredModeratorRoleIds.length,
      moderatorRoleNameCount: moderatorRoleNames.length,
    });

    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "moderation_not_configured",
          message: "Gallery moderation is not configured yet. Please contact leadership.",
        },
        500,
      ),
    };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  const user = userData?.user;

  if (userError || !user?.id) {
    console.warn("gallery moderation invalid user JWT", {
      message: userError?.message || "Missing user",
    });

    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "invalid_auth",
          message: "Your sign-in session could not be verified. Please sign in again.",
        },
        401,
      ),
    };
  }

  const userId = String(user.id);
  const { data: profileData, error: profileError } = await adminClient
    .from("member_profiles")
    .select("discord_user_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("gallery moderation profile lookup failed", {
      code: profileError.code,
      message: profileError.message,
    });
  }

  const profile = profileData as JsonRecord | null;
  const discordUserId = resolveDiscordIdentity(user as unknown as JsonRecord, profile);

  if (!discordUserId) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "missing_discord_identity",
          message: "Discord identity was not found on this account. Sign in with Discord and try again.",
        },
        403,
      ),
    };
  }

  const discordResponse = await fetch(
    `${DISCORD_API_BASE}/guilds/${encodeURIComponent(EXPECTED_DISCORD_GUILD_ID)}/members/${encodeURIComponent(discordUserId)}`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
        Accept: "application/json",
      },
    },
  );

  if (discordResponse.status === 429) {
    const retryAfter = discordResponse.headers.get("retry-after");
    console.warn("gallery moderation Discord rate limited", { retryAfter });

    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "discord_rate_limited",
          message: retryAfter
            ? `Discord verification is rate limited. Try again in ${retryAfter} seconds.`
            : "Discord verification is rate limited. Please try again soon.",
        },
        429,
      ),
    };
  }

  if (discordResponse.status === 404) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "not_guild_member",
          message: "Moderator access requires membership in the Mochirii Discord server.",
        },
        403,
      ),
    };
  }

  if (discordResponse.status === 401 || discordResponse.status === 403) {
    console.error("gallery moderation Discord bot permission/configuration error", {
      status: discordResponse.status,
    });

    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "discord_configuration_error",
          message: "Discord moderation verification is not available yet. Please contact leadership.",
        },
        502,
      ),
    };
  }

  if (!discordResponse.ok) {
    console.error("gallery moderation Discord lookup failed", {
      status: discordResponse.status,
      statusText: discordResponse.statusText,
    });

    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: "discord_lookup_failed",
          message: "Discord moderation verification could not be completed. Please try again later.",
        },
        502,
      ),
    };
  }

  const member = await discordResponse.json() as JsonRecord;
  const roles = asStringArray(member.roles);
  const roleSet = new Set(roles);
  const missingModeratorRoleIds = EXPECTED_MODERATOR_ROLE_IDS.filter((roleId) => !roleSet.has(roleId));
  const pending = member.pending === true;

  if (pending || missingModeratorRoleIds.length > 0) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          hasAccess: false,
          error: pending ? "discord_onboarding_pending" : "missing_moderator_role",
          missingRoleIds: missingModeratorRoleIds,
          message: pending
            ? "Complete Discord server onboarding before using gallery moderation."
            : "Gallery moderation requires the Discord Moderator role.",
        },
        403,
      ),
    };
  }

  return {
    ok: true,
    adminClient,
    user,
    userId,
    discordUserId,
    roleIds: roles,
  };
}

function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return false;

  try {
    JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
    JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
    return true;
  } catch {
    return false;
  }
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
