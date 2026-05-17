import type { User } from "@supabase/supabase-js";
import { invokeEdgeFunction, requireBrowserSupabaseClient } from "./client";
import { RECENT_VERIFICATION_MS, SAFE_PROFILE_FIELDS } from "./config";
import { getCurrentUser, requireAuth } from "./auth";
import {
  createError,
  createResult,
  failedResult,
  okResult,
  text,
  type EditableProfilePayload,
  type MemberProfile,
  type VerificationResponse,
} from "./types";

type MemberAccessResult = { user: User; profile: MemberProfile | null };

export function signedInName(user: User | null | undefined, profile?: MemberProfile | null) {
  const metadata = user?.user_metadata || {};
  return (
    text(profile?.discord_global_name) ||
    text(profile?.discord_username) ||
    text(metadata.global_name) ||
    text(metadata.full_name) ||
    text(user?.email) ||
    "Discord user"
  );
}

export function hasRecentVerification(profile?: MemberProfile | null) {
  const time = new Date(profile?.discord_verified_at || 0).getTime();
  return Number.isFinite(time) && Date.now() - time <= RECENT_VERIFICATION_MS;
}

export function profileHasVerifiedRoles(profile?: MemberProfile | null) {
  return Boolean(profile?.has_required_discord_roles === true && hasRecentVerification(profile));
}

export function profileIsActive(profile?: MemberProfile | null) {
  return Boolean(profileHasVerifiedRoles(profile) && profile?.member_status === "active");
}

function fieldLabel(key: string) {
  return key.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

export function cleanProfilePayload(payload: EditableProfilePayload = {}) {
  const clean: EditableProfilePayload = {};

  Object.entries(SAFE_PROFILE_FIELDS).forEach(([key, rules]) => {
    if (!(key in payload)) return;
    const raw = payload[key as keyof EditableProfilePayload];
    const value = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim();

    if (!value) {
      if ("required" in rules && rules.required) throw new Error("Display name is required.");
      clean[key as keyof EditableProfilePayload] = null;
      return;
    }

    if ("min" in rules && rules.min && value.length < rules.min) {
      throw new Error("Display name must be at least 2 characters.");
    }
    if (value.length > rules.max) {
      throw new Error(`${fieldLabel(key)} must be ${rules.max} characters or fewer.`);
    }

    clean[key as keyof EditableProfilePayload] = value;
  });

  return clean;
}

export async function getCurrentProfile() {
  try {
    const client = requireBrowserSupabaseClient();
    const userResult = await getCurrentUser();
    const user = userResult.data?.user;
    if (!userResult.ok || !user) {
      return createResult<MemberProfile>({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        data: null,
        error: createError("Sign in before loading your profile."),
      });
    }

    const { data, error, status, statusText } = await client
      .from("member_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return createResult<MemberProfile>({
        ok: false,
        status,
        statusText,
        data: null,
        error: createError(error),
      });
    }

    return okResult((data || null) as MemberProfile | null);
  } catch (error) {
    return failedResult<MemberProfile>(error);
  }
}

export async function updateCurrentProfile(payload: EditableProfilePayload) {
  try {
    const client = requireBrowserSupabaseClient();
    const userResult = await getCurrentUser();
    const user = userResult.data?.user;
    if (!userResult.ok || !user) throw new Error("Sign in before updating your profile.");

    const clean = cleanProfilePayload(payload);
    if (!Object.keys(clean).length) throw new Error("No editable profile fields were provided.");

    const { data, error, status, statusText } = await client
      .from("member_profiles")
      .update(clean)
      .eq("id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return createResult<MemberProfile>({
        ok: false,
        status,
        statusText,
        data: null,
        error: createError(error),
      });
    }

    return okResult(data as MemberProfile, "Profile saved.");
  } catch (error) {
    return failedResult<MemberProfile>(error);
  }
}

export async function verifyDiscordMembership() {
  return invokeEdgeFunction<VerificationResponse>("verify-discord-member", {});
}

export async function requireVerifiedGuildMember(options: { refresh?: boolean } = {}) {
  const auth = await requireAuth();
  if (!auth.ok || !auth.data?.user) {
    return createResult<MemberAccessResult>({
      ok: false,
      status: auth.status || 401,
      statusText: auth.statusText || "Unauthorized",
      data: null,
      error: auth.error || createError("Sign in before continuing."),
    });
  }
  if (options.refresh) await verifyDiscordMembership();

  const profileResult = await getCurrentProfile();
  const profile = profileResult.data;

  if (!profileResult.ok || !profile || !profileHasVerifiedRoles(profile)) {
    return createResult<MemberAccessResult>({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      data: { user: auth.data.user, profile },
      error: createError("Discord membership and both required roles must be verified first."),
    });
  }

  return okResult({ user: auth.data.user, profile });
}

export async function requireActiveMember(options: { refresh?: boolean } = {}) {
  const verified = await requireVerifiedGuildMember(options);
  if (!verified.ok) return verified;
  const profile = verified.data?.profile;
  if (profile?.member_status !== "active") {
    return createResult({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      data: verified.data,
      error: createError("Your website member status must be active before uploading."),
    });
  }

  return verified;
}
