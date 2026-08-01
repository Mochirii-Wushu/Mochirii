import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  constantTimeEquals,
  type JsonRecord,
  parsePixelfedSocialSyncPayload,
  PIXELFED_SOCIAL_SYNC_SECRET_HEADER,
} from "../_shared/pixelfed-social-sync.ts";
import { getServiceRoleKey } from "../_shared/supabase-service-role.ts";
import {
  asRecord,
  profileMatchesTrustedDiscordIdentity,
  resolveDiscordIdentity,
  safeString,
} from "../_shared/member-verification-identity.ts";
import {
  currentSocialDiscordMembership,
  type SocialDiscordMembershipResult,
} from "../_shared/social-discord-membership.ts";

export type SyncPixelfedSocialAccountDependencies = {
  readEnv?: (name: string) => string;
  readServiceRoleKey?: () => string;
  createAdminClient?: (url: string, key: string) => SupabaseClient;
  checkDiscordMembership?: (
    input: Parameters<typeof currentSocialDiscordMembership>[0],
  ) => Promise<SocialDiscordMembershipResult>;
  now?: () => number;
};

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function verifySyncSecret(
  req: Request,
  readEnv: (name: string) => string,
): boolean {
  const expected = readEnv("PIXELFED_SOCIAL_SYNC_SECRET");
  const actual = req.headers.get(PIXELFED_SOCIAL_SYNC_SECRET_HEADER) || "";
  return Boolean(expected && actual && constantTimeEquals(actual, expected));
}

function parseCsv(value: string | null | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function handleSyncPixelfedSocialAccountRequest(
  req: Request,
  dependencies: SyncPixelfedSocialAccountDependencies = {},
): Promise<Response> {
  const readEnv = dependencies.readEnv ||
    ((name: string) => Deno.env.get(name) || "");
  const readServiceRoleKey = dependencies.readServiceRoleKey ||
    getServiceRoleKey;
  const createAdminClient = dependencies.createAdminClient ||
    ((url: string, key: string) =>
      createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }));
  const checkDiscordMembership = dependencies.checkDiscordMembership ||
    currentSocialDiscordMembership;
  const nowMs = (dependencies.now || Date.now)();

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (!verifySyncSecret(req, readEnv)) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  const supabaseUrl = readEnv("SUPABASE_URL");
  const serviceRoleKey = readServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "sync-pixelfed-social-account missing Supabase service configuration",
      {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      },
    );
    return jsonResponse({ ok: false, error: "service_not_configured" }, 500);
  }

  let payload;
  try {
    payload = parsePixelfedSocialSyncPayload(await req.json(), nowMs);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_payload",
        message: error instanceof Error ? error.message : "Invalid payload.",
      },
      400,
    );
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

  const [
    { data: userData, error: userError },
    { data: profileData, error: profileError },
  ] = await Promise.all([
    adminClient.auth.admin.getUserById(payload.sub),
    adminClient
      .from("member_profiles")
      .select("id,member_status,discord_user_id")
      .eq("id", payload.sub)
      .maybeSingle(),
  ]);

  if (userError || !userData?.user?.id) {
    console.warn("sync-pixelfed-social-account rejected unknown user", {
      message: userError?.message || "Missing user",
    });
    return jsonResponse({ ok: false, error: "unknown_user" }, 404);
  }

  if (profileError) {
    console.error("sync-pixelfed-social-account profile lookup failed", {
      code: profileError.code,
      message: profileError.message,
    });
    return jsonResponse({ ok: false, error: "profile_lookup_failed" }, 500);
  }

  const now = new Date(nowMs).toISOString();
  const user = asRecord(userData.user);
  const profile = profileData ? asRecord(profileData) : null;
  const trustedDiscordUserId = resolveDiscordIdentity(user);
  const locallyEligible = safeString(profile?.member_status, 40) === "active" &&
    profileMatchesTrustedDiscordIdentity(
      profile?.discord_user_id,
      trustedDiscordUserId,
    );
  const discordMembership = locallyEligible && trustedDiscordUserId
    ? await checkDiscordMembership({
      discordUserId: trustedDiscordUserId,
      configuredGuildId: readEnv("DISCORD_GUILD_ID"),
      configuredRequiredRoleIds: parseCsv(readEnv("DISCORD_REQUIRED_ROLE_IDS")),
      botToken: readEnv("DISCORD_BOT_TOKEN"),
    })
    : { status: "denied" as const, reason: "not_member" as const };

  if (discordMembership.status === "unavailable") {
    console.warn(
      "sync-pixelfed-social-account current Discord verification unavailable",
      {
        reason: discordMembership.reason,
      },
    );
    return jsonResponse({
      ok: false,
      error: "discord_verification_unavailable",
    }, 503);
  }

  if (discordMembership.status !== "verified") {
    const { error: revokeError } = await adminClient
      .from("social_accounts")
      .update({
        status: "revoked",
        profile_link_visible: false,
        federation_enabled: false,
        revoked_at: now,
        last_synced_at: now,
      })
      .eq("user_id", payload.sub)
      .eq("provider", "pixelfed");

    if (revokeError) {
      console.error("sync-pixelfed-social-account access revocation failed", {
        code: revokeError.code,
        message: revokeError.message,
      });
      return jsonResponse(
        { ok: false, error: "access_revocation_failed" },
        500,
      );
    }

    return jsonResponse(
      { ok: false, error: "current_member_access_required" },
      403,
    );
  }

  const socialAccount: JsonRecord = {
    user_id: payload.sub,
    member_profile_id: profileData?.id || null,
    provider: "pixelfed",
    provider_subject: payload.sub,
    provider_user_id: payload.provider_user_id,
    username: payload.username,
    profile_url: payload.profile_url,
    status: "active",
    federation_enabled: false,
    last_synced_at: now,
    revoked_at: null,
  };
  if (payload.event === "login" || payload.event === "account_created") {
    socialAccount.last_login_at = now;
  }

  const { error: upsertError } = await adminClient
    .from("social_accounts")
    .upsert(
      socialAccount,
      { onConflict: "user_id,provider" },
    );

  if (upsertError) {
    console.error("sync-pixelfed-social-account upsert failed", {
      code: upsertError.code,
      message: upsertError.message,
    });
    return jsonResponse(
      { ok: false, error: "social_account_upsert_failed" },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    status: "synced",
    profileUrl: payload.profile_url,
  });
}

if (import.meta.main) {
  Deno.serve((req: Request) => handleSyncPixelfedSocialAccountRequest(req));
}
