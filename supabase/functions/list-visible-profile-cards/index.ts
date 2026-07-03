import "@supabase/functions-js/edge-runtime.d.ts";
import {
  asArray,
  asRecord,
  asStringArray,
  CORS_HEADERS,
  createAdminClient,
  jsonResponse,
  loadRankResources,
  mediaByIds,
  RECENT_VERIFICATION_MS,
  safeString,
  signedMediaUrl,
  slug,
  text,
  titleFromRoles,
} from "../_shared/member-profiles.ts";

function recentVerification(value: unknown): boolean {
  const verifiedAt = new Date(String(value || "")).getTime();
  return Number.isFinite(verifiedAt) && Date.now() - verifiedAt <= RECENT_VERIFICATION_MS;
}

function hasFilledPublicProfile(profile: Record<string, unknown>): boolean {
  return [
    profile.display_name,
    profile.bio,
    profile.game_uid,
    profile.region,
    profile.timezone,
    profile.approved_avatar_media_id,
    profile.approved_banner_media_id,
  ].some((value) => text(value).length > 0);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed", message: "Use POST." }, 405);
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonResponse(
      {
        ok: false,
        error: "profile_cards_not_configured",
        message: "Profile cards are not configured yet.",
      },
      500,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = asRecord(await req.json());
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400);
  }

  const requestedSlugs = Array.from(
    new Set(asArray(body.slugs).map(slug).filter((value): value is string => Boolean(value))),
  ).slice(0, 12);

  if (!requestedSlugs.length) {
    return jsonResponse({ ok: true, data: { profiles: [], count: 0, signedUrlSeconds: 600 } });
  }

  const { data, error } = await adminClient
    .from("member_profiles")
    .select(
      "id,profile_slug,display_name,member_status,has_required_discord_roles,discord_verified_at,discord_roles,bio,game_uid,region,timezone,profile_public_enabled,approved_avatar_media_id,approved_banner_media_id,profile_published_at",
    )
    .in("profile_slug", requestedSlugs)
    .eq("profile_public_enabled", true)
    .eq("member_status", "active")
    .eq("has_required_discord_roles", true);

  if (error) {
    console.error("visible profile cards lookup failed", {
      code: error.code,
      message: error.message,
    });
    return jsonResponse({ ok: false, error: "profile_cards_failed", message: "Profile cards could not be loaded." }, 500);
  }

  const profiles = asArray(data).map(asRecord).filter((profile) => recentVerification(profile.discord_verified_at));
  const avatarIds = profiles.map((profile) => safeString(profile.approved_avatar_media_id, 80) || "").filter(Boolean);
  const media = await mediaByIds(adminClient, avatarIds);
  const rankResources = await loadRankResources(adminClient);

  const cards = await Promise.all(
    profiles.map(async (profile) => {
      const profileSlug = safeString(profile.profile_slug, 80) || "";
      const avatarId = safeString(profile.approved_avatar_media_id, 80) || "";
      const avatar = media.get(avatarId) || null;
      return {
        slug: profileSlug,
        displayName: text(profile.display_name, "Mōchirīī Member"),
        guildTitle: titleFromRoles(asStringArray(profile.discord_roles), rankResources),
        avatarUrl: await signedMediaUrl(adminClient, avatar),
        profileHref: "",
        hasApprovedAvatar: Boolean(avatar),
        hasVisibleProfile: true,
        hasFilledProfile: hasFilledPublicProfile(profile),
      };
    }),
  );

  return jsonResponse({
    ok: true,
    data: {
      profiles: cards,
      count: cards.length,
      signedUrlSeconds: 600,
    },
  });
});
