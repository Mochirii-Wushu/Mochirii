import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type JsonRecord = Record<string, unknown>;

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const PROFILE_MEDIA_BUCKET = "member-profile-media";
export const PROFILE_MEDIA_SIGNED_URL_SECONDS = 10 * 60;
export const PROFILE_MEDIA_LIMITS = {
  avatar: 50 * 1024 * 1024,
  banner: 50 * 1024 * 1024,
} as const;
export const ACCEPTED_PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const RECENT_VERIFICATION_MS = 7 * 24 * 60 * 60 * 1000;
export const BASE_GUILD_ROLE_ID = "1468659807736299520";

export type ActiveMemberAccess = {
  ok: true;
  adminClient: SupabaseClient;
  user: User;
  userId: string;
  profile: JsonRecord;
};

export type AccessFailure = {
  ok: false;
  response: Response;
};

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

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

export function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function text(value: unknown, fallback = ""): string {
  return safeString(value, 5000) || fallback;
}

export function profileImageKind(value: unknown): "avatar" | "banner" | null {
  const kind = safeString(value, 20)?.toLowerCase();
  return kind === "avatar" || kind === "banner" ? kind : null;
}

export function normalizedMime(value: unknown): string | null {
  const mime = safeString(value, 80)?.split(";")[0]?.trim().toLowerCase() || null;
  if (mime === "image/jpg") return "image/jpeg";
  return mime && ACCEPTED_PROFILE_IMAGE_TYPES.has(mime) ? mime : null;
}

export function slug(value: unknown): string | null {
  const clean = safeString(value, 80)?.toLowerCase() || "";
  return /^[a-z0-9][a-z0-9-]{1,63}$/.test(clean) ? clean : null;
}

export function getServiceRoleKey(): string {
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

export function createAdminClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function readJsonBody(req: Request): Promise<{ ok: true; body: JsonRecord } | AccessFailure> {
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

function recentVerification(value: unknown): boolean {
  const verifiedAt = new Date(String(value || "")).getTime();
  return Number.isFinite(verifiedAt) && Date.now() - verifiedAt <= RECENT_VERIFICATION_MS;
}

export async function requireActiveMember(req: Request): Promise<ActiveMemberAccess | AccessFailure> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          error: "member_profiles_not_configured",
          message: "Member profiles are not configured yet.",
        },
        500,
      ),
    };
  }

  const accessToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          error: "missing_auth",
          message: "Choose a sign-in method before viewing member profiles.",
        },
        401,
      ),
    };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  const user = userData?.user;
  if (userError || !user?.id) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          error: "invalid_auth",
          message: "Your sign-in session could not be verified. Please sign in again.",
        },
        401,
      ),
    };
  }

  const { data: profileData, error: profileError } = await adminClient
    .from("member_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profileData) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          error: "profile_not_found",
          message: "Your member profile could not be loaded.",
        },
        403,
      ),
    };
  }

  const profile = asRecord(profileData);
  if (
    profile.member_status !== "active" ||
    profile.has_required_discord_roles !== true ||
    !recentVerification(profile.discord_verified_at)
  ) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          error: "active_member_required",
          message: "Member profiles require active, recently verified Discord membership.",
        },
        403,
      ),
    };
  }

  return {
    ok: true,
    adminClient,
    user,
    userId: String(user.id),
    profile,
  };
}

export function titleFromRoles(discordRoles: unknown, rankResources: JsonRecord[]): string {
  const roleSet = new Set(asStringArray(discordRoles));
  if (!roleSet.has(BASE_GUILD_ROLE_ID)) return "Mōchirīī Member";

  const ranks = rankResources
    .map((resource) => {
      const metadata = asRecord(resource.metadata);
      return {
        roleId: safeString(resource.discord_id, 40) || "",
        label: text(resource.label, "Mōchirīī Member"),
        order: Number(metadata.rankOrder || 999),
        managedBy: text(metadata.managedBy),
        vanityOnly: metadata.vanityOnly === true,
      };
    })
    .filter((rank) => rank.roleId && rank.managedBy === "reaper-rank-sync" && rank.vanityOnly)
    .sort((left, right) => left.order - right.order);

  return ranks.find((rank) => roleSet.has(rank.roleId))?.label || "Mōchirīī Member";
}

export async function loadRankResources(adminClient: SupabaseClient): Promise<JsonRecord[]> {
  const { data, error } = await adminClient
    .from("discord_resources")
    .select("label,discord_id,metadata")
    .eq("kind", "role")
    .eq("enabled", true);

  if (error) {
    console.error("member profile rank resource lookup failed", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return asArray(data).map(asRecord);
}

export async function signedMediaUrl(adminClient: SupabaseClient, media: JsonRecord | null): Promise<string | null> {
  if (!media) return null;
  const path = safeString(media.storage_path, 500);
  if (!path) return null;

  const { data, error } = await adminClient.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUrl(path, PROFILE_MEDIA_SIGNED_URL_SECONDS);

  if (error) {
    console.warn("member profile signed URL creation failed", {
      message: error.message,
    });
    return null;
  }

  return data?.signedUrl || null;
}

export async function mediaByIds(adminClient: SupabaseClient, ids: string[]): Promise<Map<string, JsonRecord>> {
  const cleanIds = ids.filter(Boolean);
  if (!cleanIds.length) return new Map();

  const { data, error } = await adminClient
    .from("member_profile_media")
    .select("*")
    .in("id", cleanIds)
    .eq("status", "approved");

  if (error) {
    console.error("member profile approved media lookup failed", {
      code: error.code,
      message: error.message,
    });
    return new Map();
  }

  return new Map(asArray(data).map((item) => {
    const record = asRecord(item);
    return [String(record.id || ""), record];
  }));
}

export async function publicProfileDto(
  adminClient: SupabaseClient,
  profile: JsonRecord,
  rankResources: JsonRecord[],
): Promise<JsonRecord> {
  const avatarId = safeString(profile.approved_avatar_media_id, 80) || "";
  const bannerId = safeString(profile.approved_banner_media_id, 80) || "";
  const media = await mediaByIds(adminClient, [avatarId, bannerId]);
  const avatar = media.get(avatarId) || null;
  const banner = media.get(bannerId) || null;
  const verifiedForTitle =
    profile.member_status === "active" &&
    profile.has_required_discord_roles === true &&
    recentVerification(profile.discord_verified_at);

  return {
    id: safeString(profile.id, 80),
    slug: safeString(profile.profile_slug, 80),
    displayName: text(profile.display_name, "Mōchirīī Member"),
    gameUid: text(profile.game_uid),
    discordHandle: text(profile.discord_handle || profile.discord_username),
    region: text(profile.region),
    timezone: text(profile.timezone),
    bio: text(profile.bio),
    guildTitle: verifiedForTitle ? titleFromRoles(profile.discord_roles, rankResources) : "Mōchirīī Member",
    avatarUrl: await signedMediaUrl(adminClient, avatar),
    bannerUrl: await signedMediaUrl(adminClient, banner),
    profilePublishedAt: safeString(profile.profile_published_at, 40),
    updatedAt: safeString(profile.updated_at, 40),
  };
}
