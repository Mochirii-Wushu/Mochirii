import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import {
  profileMatchesTrustedDiscordIdentity,
  resolveDiscordIdentity,
  type SyncedProviderIdentity,
} from "./member-verification-identity.ts";
import { getServiceRoleKey } from "./supabase-service-role.ts";

const RECENT_VERIFICATION_MS = 7 * 24 * 60 * 60 * 1000;
export const SPINNER_MODERATOR_CACHE_MS = 5 * 60 * 1000;

type MemberProfile = {
  member_status?: unknown;
  discord_user_id?: unknown;
  discord_verified_at?: unknown;
};

type MemberVerification = {
  gallery_access_status?: unknown;
  gallery_access_verified_at?: unknown;
  gallery_access_expires_at?: unknown;
};

type SpinnerAccessFailure = {
  ok: false;
  status: number;
  error: string;
};

export type SpinnerMemberAccess =
  | {
    ok: true;
    adminClient: SupabaseClient;
    userId: string;
  }
  | SpinnerAccessFailure;

export type SpinnerIdentityAccess =
  | {
    ok: true;
    adminClient: SupabaseClient;
    user: User;
    userId: string;
  }
  | SpinnerAccessFailure;

export function requestedSpinnerAccessMode(
  req: Request,
): "controller" | "viewer" {
  return req.headers.get("x-mochirii-spinner-mode") === "controller"
    ? "controller"
    : "viewer";
}

export function moderatorAuthorizationIsCurrent(
  expiresAt: unknown,
  nowMs = Date.now(),
): boolean {
  if (typeof expiresAt !== "string") return false;
  const expiryMs = Date.parse(expiresAt);
  return Number.isFinite(expiryMs) && expiryMs > nowMs &&
    expiryMs <= nowMs + SPINNER_MODERATOR_CACHE_MS;
}

export async function resolveModeratorAuthorizationRoute(
  expiresAt: unknown,
  verifyExact: () => Promise<boolean>,
  nowMs = Date.now(),
): Promise<"cached" | "verified" | "denied"> {
  if (moderatorAuthorizationIsCurrent(expiresAt, nowMs)) return "cached";
  try {
    return await verifyExact() ? "verified" : "denied";
  } catch {
    return "denied";
  }
}

export function isActiveVerifiedGuildMember(
  profile: MemberProfile | null | undefined,
  verification: MemberVerification | null | undefined = null,
  trustedDiscordUserId: string | null = null,
  nowMs = Date.now(),
): boolean {
  const verifiedAt = typeof profile?.discord_verified_at === "string"
    ? Date.parse(profile.discord_verified_at)
    : Number.NaN;
  const discordVerified = profileMatchesTrustedDiscordIdentity(
    profile?.discord_user_id,
    trustedDiscordUserId,
  ) && Number.isFinite(verifiedAt) &&
    verifiedAt <= nowMs &&
    nowMs - verifiedAt <= RECENT_VERIFICATION_MS;
  const manualVerifiedAt =
    typeof verification?.gallery_access_verified_at === "string"
      ? Date.parse(verification.gallery_access_verified_at)
      : Number.NaN;
  const manualExpiresAt =
    typeof verification?.gallery_access_expires_at === "string"
      ? Date.parse(verification.gallery_access_expires_at)
      : null;
  const manualApproved = verification?.gallery_access_status === "approved" &&
    Number.isFinite(manualVerifiedAt) &&
    (manualExpiresAt === null ||
      (Number.isFinite(manualExpiresAt) && manualExpiresAt >= nowMs));

  return profile?.member_status === "active" &&
    (discordVerified || manualApproved);
}

export async function authenticateSpinnerUser(
  req: Request,
): Promise<SpinnerIdentityAccess> {
  const accessToken = (req.headers.get("Authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  ).trim();
  if (!accessToken) return { ok: false, status: 401, error: "missing_auth" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "spinner-live-session missing member authority configuration",
      {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      },
    );
    return { ok: false, status: 500, error: "authority_not_configured" };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await adminClient.auth.getUser(
    accessToken,
  );
  const user = userData?.user;
  const userId = user?.id;
  if (userError || !userId || !user) {
    console.warn("spinner-live-session rejected invalid user session", {
      message: userError?.message || "Missing user",
    });
    return { ok: false, status: 401, error: "invalid_auth" };
  }

  return { ok: true, adminClient, user, userId };
}

export async function requireActiveVerifiedSpinnerMember(
  req: Request,
): Promise<SpinnerMemberAccess> {
  const identity = await authenticateSpinnerUser(req);
  if (!identity.ok) return identity;

  const { adminClient, user, userId } = identity;

  const [profileResult, verificationResult, identityResult] = await Promise.all(
    [
      adminClient
        .from("member_profiles")
        .select("member_status,discord_user_id,discord_verified_at")
        .eq("id", userId)
        .maybeSingle(),
      adminClient
        .from("member_verifications")
        .select(
          "gallery_access_status,gallery_access_verified_at,gallery_access_expires_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      adminClient
        .from("member_auth_identities")
        .select("provider,provider_subject,active")
        .eq("user_id", userId)
        .eq("provider", "discord")
        .eq("active", true),
    ],
  );

  const { data: profile, error: profileError } = profileResult;
  const { data: verification, error: verificationError } = verificationResult;
  const { data: identityRows, error: identityError } = identityResult;

  if (profileError) {
    console.error("spinner-live-session member profile lookup failed", {
      code: profileError.code,
      message: profileError.message,
    });
    return { ok: false, status: 500, error: "member_lookup_failed" };
  }
  if (verificationError) {
    console.error("spinner-live-session member verification lookup failed", {
      code: verificationError.code,
      message: verificationError.message,
    });
    return { ok: false, status: 500, error: "member_lookup_failed" };
  }
  if (identityError) {
    console.error("spinner-live-session trusted identity lookup failed", {
      code: identityError.code,
      message: identityError.message,
    });
  }
  const trustedDiscordUserId = identityError ? null : resolveDiscordIdentity(
    user as unknown as Record<string, unknown>,
    (identityRows || []) as SyncedProviderIdentity[],
  );
  if (
    !isActiveVerifiedGuildMember(
      profile as MemberProfile | null,
      verification as MemberVerification | null,
      trustedDiscordUserId,
    )
  ) {
    return { ok: false, status: 404, error: "not_found" };
  }

  return { ok: true, adminClient, userId };
}
