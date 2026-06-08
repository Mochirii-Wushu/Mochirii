import "@supabase/functions-js/edge-runtime.d.ts";
import {
  jsonResponse,
  loadRankResources,
  publicProfileDto,
  readJsonBody,
  requireActiveMember,
  slug,
} from "../_shared/member-profiles.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonResponse({}).headers });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);

  const bodyResult = await readJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const profileSlug = slug(bodyResult.body.slug);
  if (!profileSlug) return jsonResponse({ ok: false, error: "invalid_slug", message: "Choose a valid member profile." }, 400);

  const access = await requireActiveMember(req);
  if (!access.ok) return access.response;

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await access.adminClient
    .from("member_profiles")
    .select("id,profile_slug,display_name,timezone,bio,discord_roles,member_status,has_required_discord_roles,discord_verified_at,profile_public_enabled,profile_published_at,approved_avatar_media_id,approved_banner_media_id,updated_at")
    .eq("profile_slug", profileSlug)
    .eq("profile_public_enabled", true)
    .eq("member_status", "active")
    .eq("has_required_discord_roles", true)
    .gte("discord_verified_at", cutoff)
    .maybeSingle();

  if (error) {
    console.error("get-member-profile lookup failed", { code: error.code, message: error.message });
    return jsonResponse({ ok: false, error: "profile_lookup_failed", message: "Member profile could not be loaded." }, 500);
  }

  if (!data) return jsonResponse({ ok: false, error: "profile_not_found", message: "That member profile is not published." }, 404);

  const rankResources = await loadRankResources(access.adminClient);
  const profile = await publicProfileDto(access.adminClient, data, rankResources);
  return jsonResponse({ ok: true, data: { profile, signedUrlSeconds: 600 } });
});
