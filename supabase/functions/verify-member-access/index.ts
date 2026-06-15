import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

type SyncedIdentity = {
  provider: string;
  provider_subject: string;
  provider_email: string | null;
  provider_email_verified: boolean;
  provider_phone: string | null;
  provider_phone_verified: boolean;
  display_label: string | null;
  active: boolean;
  first_observed_at?: string;
  last_observed_at: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DISCORD_API_BASE = "https://discord.com/api/v10";
const EXPECTED_DISCORD_GUILD_ID = "1078630751077142608";
const EXPECTED_REQUIRED_ROLE_IDS = ["1468659807736299520", "1078630751077142615"];
const APPROVED_PROVIDER_IDS = new Set(["discord", "phone", "apple", "facebook", "google", "kakao", "twitch", "spotify"]);
const NON_DISCORD_METHODS = new Set(["manual_review", "phone", "apple", "facebook", "google", "kakao", "twitch", "spotify"]);
const LOCKED_STATUSES = new Set(["suspended", "archived"]);
const RECENT_VERIFICATION_MS = 7 * 24 * 60 * 60 * 1000;

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function parseCsv(value: string | null | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function truthy(value: unknown): boolean {
  return value === true || String(value).toLowerCase() === "true";
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

async function readOptionalBody(req: Request): Promise<JsonRecord> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return {};
  try {
    return asRecord(await req.json());
  } catch {
    return {};
  }
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

function providerSubject(provider: string, identity: JsonRecord, identityData: JsonRecord, user: JsonRecord): string | null {
  if (provider === "phone") {
    return safeString(identity.provider_id || identityData.provider_id || identityData.sub || user.phone, 255);
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

function identityDisplayLabel(provider: string, identityData: JsonRecord, user: JsonRecord): string | null {
  const metadata = asRecord(user.user_metadata);
  const email = safeString(identityData.email || user.email, 120);
  const phone = safeString(identityData.phone || user.phone, 40);
  return safeString(
    identityData.global_name ||
      identityData.full_name ||
      identityData.name ||
      identityData.preferred_username ||
      identityData.user_name ||
      identityData.username ||
      metadata.global_name ||
      metadata.full_name ||
      metadata.name ||
      email ||
      phone ||
      provider,
    120,
  );
}

function normalizeIdentity(identityValue: unknown, user: JsonRecord, now: string): SyncedIdentity | null {
  const identity = asRecord(identityValue);
  const provider = safeString(identity.provider, 40)?.toLowerCase();
  if (!provider || !APPROVED_PROVIDER_IDS.has(provider)) return null;

  const identityData = asRecord(identity.identity_data);
  const subject = providerSubject(provider, identity, identityData, user);
  if (!subject) return null;

  const email = safeString(identityData.email || user.email, 320);
  const phone = safeString(identityData.phone || user.phone, 40);
  return {
    provider,
    provider_subject: subject,
    provider_email: email,
    provider_email_verified: truthy(identityData.email_verified || identityData.verified_email),
    provider_phone: phone,
    provider_phone_verified: provider === "phone" || truthy(identityData.phone_verified),
    display_label: identityDisplayLabel(provider, identityData, user),
    active: true,
    last_observed_at: now,
  };
}

function phoneIdentity(user: JsonRecord, now: string): SyncedIdentity | null {
  const phone = safeString(user.phone, 40);
  if (!phone) return null;

  return {
    provider: "phone",
    provider_subject: phone,
    provider_email: null,
    provider_email_verified: false,
    provider_phone: phone,
    provider_phone_verified: true,
    display_label: phone,
    active: true,
    last_observed_at: now,
  };
}

function discordIdentityFromUser(user: JsonRecord, profile: JsonRecord | null, identities: SyncedIdentity[]): string | null {
  const synced = identities.find((identity) => identity.provider === "discord")?.provider_subject;
  if (synced) return synced;

  const userIdentities = Array.isArray(user.identities) ? user.identities : [];
  for (const identity of userIdentities) {
    const record = asRecord(identity);
    if (record.provider !== "discord") continue;
    const identityData = asRecord(record.identity_data);
    const id = providerSubject("discord", record, identityData, user);
    if (id) return id;
  }

  const metadata = asRecord(user.user_metadata);
  return safeString(profile?.discord_user_id || metadata.provider_id || metadata.sub || metadata.id || metadata.user_id, 40);
}

function discordAvatarUrl(discordUser: JsonRecord): string | null {
  const id = safeString(discordUser.id, 40);
  const avatar = safeString(discordUser.avatar, 120);
  if (!id || !avatar) return null;
  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(id)}/${encodeURIComponent(avatar)}.${extension}`;
}

function recentDiscordVerification(profile: JsonRecord | null): boolean {
  const verifiedAt = safeString(profile?.discord_verified_at, 80);
  if (!verifiedAt) return false;
  const timestamp = Date.parse(verifiedAt);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= RECENT_VERIFICATION_MS;
}

function approvedManualVerification(verification: JsonRecord | null): boolean {
  const status = safeString(verification?.gallery_access_status, 40);
  const verifiedAt = safeString(verification?.gallery_access_verified_at, 80);
  const expiresAt = safeString(verification?.gallery_access_expires_at, 80);
  if (status !== "approved" || !verifiedAt) return false;
  if (!expiresAt) return true;
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry >= Date.now();
}

function publicIdentity(identity: JsonRecord): JsonRecord {
  return {
    provider: safeString(identity.provider, 40),
    providerSubject: safeString(identity.provider_subject, 255),
    displayLabel: safeString(identity.display_label, 120),
    emailVerified: identity.provider_email_verified === true,
    phoneVerified: identity.provider_phone_verified === true,
    active: identity.active === true,
    lastObservedAt: safeString(identity.last_observed_at, 80),
  };
}

function publicVerification(verification: JsonRecord | null): JsonRecord | null {
  if (!verification) return null;
  return {
    status: safeString(verification.gallery_access_status, 40),
    method: safeString(verification.gallery_access_method, 40),
    verifiedAt: safeString(verification.gallery_access_verified_at, 80),
    expiresAt: safeString(verification.gallery_access_expires_at, 80),
    reviewedAt: safeString(verification.reviewed_at, 80),
    reason: safeString(verification.redacted_reason, 500),
  };
}

async function syncIdentities(
  adminClient: SupabaseClient,
  userId: string,
  user: JsonRecord,
  now: string,
): Promise<SyncedIdentity[]> {
  const rawIdentities = Array.isArray(user.identities) ? user.identities : [];
  const normalized = rawIdentities
    .map((identity) => normalizeIdentity(identity, user, now))
    .filter((identity): identity is SyncedIdentity => Boolean(identity));
  const phone = phoneIdentity(user, now);
  if (phone && !normalized.some((identity) => identity.provider === "phone" && identity.provider_subject === phone.provider_subject)) {
    normalized.push(phone);
  }

  const { error: deactivateError } = await adminClient
    .from("member_auth_identities")
    .update({ active: false, updated_at: now })
    .eq("user_id", userId);

  if (deactivateError) {
    console.error("verify-member-access identity deactivate failed", {
      code: deactivateError.code,
      message: deactivateError.message,
    });
    throw new Error("Linked sign-in methods could not be synced.");
  }

  if (normalized.length > 0) {
    const rows = normalized.map((identity) => ({
      user_id: userId,
      ...identity,
    }));
    const { error: upsertError } = await adminClient
      .from("member_auth_identities")
      .upsert(rows, { onConflict: "user_id,provider,provider_subject" });

    if (upsertError) {
      console.error("verify-member-access identity upsert failed", {
        code: upsertError.code,
        message: upsertError.message,
      });
      throw new Error("Linked sign-in methods could not be saved.");
    }
  }

  const { data: verificationRow, error: verificationLookupError } = await adminClient
    .from("member_verifications")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (verificationLookupError) {
    console.error("verify-member-access verification sync timestamp failed", {
      code: verificationLookupError.code,
      message: verificationLookupError.message,
    });
    throw new Error("Member verification state could not be synced.");
  }

  const verificationWrite = verificationRow
    ? await adminClient
      .from("member_verifications")
      .update({ last_identity_sync_at: now, updated_at: now })
      .eq("user_id", userId)
    : await adminClient
      .from("member_verifications")
      .insert({ user_id: userId, last_identity_sync_at: now });

  if (verificationWrite.error) {
    console.error("verify-member-access verification sync timestamp failed", {
      code: verificationWrite.error.code,
      message: verificationWrite.error.message,
    });
    throw new Error("Member verification state could not be synced.");
  }

  return normalized;
}

async function ensureMemberProfile(
  adminClient: SupabaseClient,
  userId: string,
  user: JsonRecord,
  profile: JsonRecord | null,
): Promise<JsonRecord | null> {
  if (profile) return profile;

  const { data, error } = await adminClient
    .from("member_profiles")
    .insert({
      id: userId,
      display_name: defaultDisplayName(user),
      member_status: "pending",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("verify-member-access profile bootstrap failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Member profile could not be created.");
  }

  return data as JsonRecord | null;
}

async function updateDiscordProfile(
  adminClient: SupabaseClient,
  userId: string,
  user: JsonRecord,
  profile: JsonRecord | null,
  discordUserId: string,
  now: string,
): Promise<{ ok: boolean; status?: number; message?: string }> {
  const configuredGuildId = Deno.env.get("DISCORD_GUILD_ID") || "";
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN") || "";
  const configuredRequiredRoleIds = parseCsv(Deno.env.get("DISCORD_REQUIRED_ROLE_IDS"));
  const guildConfigMatches = configuredGuildId === EXPECTED_DISCORD_GUILD_ID;
  const roleConfigMatches =
    configuredRequiredRoleIds.length === EXPECTED_REQUIRED_ROLE_IDS.length &&
    EXPECTED_REQUIRED_ROLE_IDS.every((roleId) => configuredRequiredRoleIds.includes(roleId));

  if (!botToken || !guildConfigMatches || !roleConfigMatches) {
    return { ok: false, status: 500, message: "Discord verification is not configured yet. Please contact leadership." };
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
    return {
      ok: false,
      status: 429,
      message: retryAfter
        ? `Discord verification is rate limited. Try again in ${retryAfter} seconds.`
        : "Discord verification is rate limited. Please try again soon.",
    };
  }

  const currentStatus = safeString(profile?.member_status, 40) || "pending";
  const lockedStatus = LOCKED_STATUSES.has(currentStatus);
  const basePayload = {
    discord_user_id: discordUserId,
    display_name: safeString(profile?.display_name, 40) || defaultDisplayName(user),
    has_required_discord_roles: false,
    discord_checked_at: now,
    discord_verified_at: null,
    member_status: lockedStatus ? currentStatus : "pending",
  };

  if (discordResponse.status === 404) {
    await adminClient.from("member_profiles").upsert(
      {
        id: userId,
        ...basePayload,
        discord_roles: [],
        discord_member_pending: null,
      },
      { onConflict: "id" },
    );
    return { ok: true, message: "Discord account is linked, but this member is not in the Discord server yet." };
  }

  if (!discordResponse.ok) {
    return { ok: false, status: discordResponse.status, message: "Discord verification could not be completed. Please try again later." };
  }

  const member = await discordResponse.json() as JsonRecord;
  const discordUser = asRecord(member.user);
  const roles = asStringArray(member.roles);
  const roleSet = new Set(roles);
  const missingRoleIds = EXPECTED_REQUIRED_ROLE_IDS.filter((roleId) => !roleSet.has(roleId));
  const pending = member.pending === true;
  const hasRequiredRoles = missingRoleIds.length === 0;
  const eligibleStatus = hasRequiredRoles && !pending;
  const nextStatus = lockedStatus ? currentStatus : eligibleStatus ? "active" : "pending";
  const discordUsername = safeString(discordUser.username, 80);
  const discordGlobalName = safeString(discordUser.global_name, 100);
  const discordAvatar = discordAvatarUrl(discordUser);

  const { error } = await adminClient.from("member_profiles").upsert(
    {
      id: userId,
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
      discord_handle: discordUsername || discordGlobalName,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("verify-member-access Discord profile upsert failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Discord verification could not update this profile.");
  }

  if (eligibleStatus && !lockedStatus) {
    return { ok: true, message: "Discord membership verified. Gallery uploads are available." };
  }
  if (pending) return { ok: true, message: "Complete Discord server onboarding before gallery uploads are available." };
  if (!hasRequiredRoles) return { ok: true, message: "Discord is linked, but required server roles are missing." };
  return { ok: true, message: "Discord roles were found, but this website account is not active. Please contact leadership." };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("verify-member-access missing Supabase service configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    return jsonResponse({ ok: false, message: "Member verification is not configured yet." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return jsonResponse({ ok: false, message: "Sign in before checking member verification." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  const user = userData?.user as unknown as JsonRecord | undefined;
  if (userError || !user?.id) {
    console.warn("verify-member-access invalid user JWT", {
      message: userError?.message || "Missing user",
    });
    return jsonResponse({ ok: false, message: "Your sign-in session could not be verified. Please sign in again." }, 401);
  }

  const userId = String(user.id);
  const body = await readOptionalBody(req);
  const now = new Date().toISOString();

  const { data: profileBefore } = await adminClient.from("member_profiles").select("*").eq("id", userId).maybeSingle();
  let profile = profileBefore as JsonRecord | null;
  try {
    profile = await ensureMemberProfile(adminClient, userId, user, profile);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Member profile could not be created." }, 500);
  }

  let syncedIdentities: SyncedIdentity[] = [];
  try {
    syncedIdentities = await syncIdentities(adminClient, userId, user, now);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Identity sync failed." }, 500);
  }

  const discordUserId = discordIdentityFromUser(user, profile, syncedIdentities);
  let verificationMessage: string | null = null;
  if (discordUserId && (body.refreshDiscord === true || !profile?.discord_checked_at)) {
    try {
      const discordResult = await updateDiscordProfile(adminClient, userId, user, profile, discordUserId, now);
      verificationMessage = discordResult.message || null;
      if (!discordResult.ok && discordResult.status && discordResult.status >= 500) {
        console.warn("verify-member-access Discord refresh warning", {
          status: discordResult.status,
          message: discordResult.message,
        });
      }
    } catch (error) {
      console.error("verify-member-access Discord refresh failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return jsonResponse({ ok: false, message: "Discord verification could not be refreshed." }, 500);
    }
  }

  const { data: profileData, error: profileError } = await adminClient
    .from("member_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("verify-member-access profile lookup failed", {
      code: profileError.code,
      message: profileError.message,
    });
    return jsonResponse({ ok: false, message: "Member profile could not be loaded." }, 500);
  }

  const { data: verificationData, error: verificationLookupError } = await adminClient
    .from("member_verifications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (verificationLookupError) {
    console.error("verify-member-access verification lookup failed", {
      code: verificationLookupError.code,
      message: verificationLookupError.message,
    });
    return jsonResponse({ ok: false, message: "Member verification could not be loaded." }, 500);
  }

  let verification = verificationData as JsonRecord | null;
  const expiresAt = safeString(verification?.gallery_access_expires_at, 80);
  if (
    safeString(verification?.gallery_access_status, 40) === "approved" &&
    expiresAt &&
    Number.isFinite(Date.parse(expiresAt)) &&
    Date.parse(expiresAt) < Date.now()
  ) {
    const { data: expiredData } = await adminClient
      .from("member_verifications")
      .update({ gallery_access_status: "expired", updated_at: now })
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    verification = expiredData as JsonRecord | null;
  }

  const { data: identityRows, error: identityLookupError } = await adminClient
    .from("member_auth_identities")
    .select("provider,provider_subject,display_label,provider_email_verified,provider_phone_verified,active,last_observed_at")
    .eq("user_id", userId)
    .eq("active", true)
    .order("provider", { ascending: true });

  if (identityLookupError) {
    console.error("verify-member-access identity lookup failed", {
      code: identityLookupError.code,
      message: identityLookupError.message,
    });
    return jsonResponse({ ok: false, message: "Linked sign-in methods could not be loaded." }, 500);
  }

  const latestProfile = profileData as JsonRecord | null;
  const memberStatus = safeString(latestProfile?.member_status, 40) || "pending";
  const discordVerified = memberStatus === "active" && recentDiscordVerification(latestProfile);
  const manualApproved = memberStatus === "active" && approvedManualVerification(verification);
  const galleryEligible = discordVerified || manualApproved;
  const method = discordVerified
    ? "discord"
    : manualApproved
      ? safeString(verification?.gallery_access_method, 40) || "manual_review"
      : null;

  let message = verificationMessage || "Member verification checked.";
  let next = "Complete Discord verification or ask leadership to review your member verification.";
  if (galleryEligible) {
    message = method === "discord"
      ? "Discord membership verified. Gallery uploads are available."
      : "Moderator-approved member verification is active. Gallery uploads are available.";
    next = "Submit an image or review your gallery submission history.";
  } else if (memberStatus === "suspended" || memberStatus === "archived") {
    message = "Gallery upload access is unavailable for this member status.";
    next = "Contact leadership if this status looks wrong.";
  } else if (verification && !NON_DISCORD_METHODS.has(safeString(verification.gallery_access_method, 40) || "")) {
    next = "Use Discord verification or request a supported member review method.";
  }

  return jsonResponse({
    ok: true,
    data: {
      galleryEligible,
      method,
      memberStatus,
      discordVerified,
      manualApproved,
      identities: (Array.isArray(identityRows) ? identityRows : []).map((identity) => publicIdentity(identity as JsonRecord)),
      verification: publicVerification(verification),
      profile: latestProfile,
      message,
      next,
    },
    message,
  });
});
