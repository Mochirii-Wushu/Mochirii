import "@supabase/functions-js/edge-runtime.d.ts";
import {
  jsonResponse,
  loadRankResources,
  publicProfileDto,
  requireActiveMember,
} from "../_shared/member-profiles.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonResponse({}).headers });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);

  const access = await requireActiveMember(req);
  if (!access.ok) return access.response;

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await access.adminClient
    .from("member_profiles")
    .select("id,profile_slug,display_name,game_uid,discord_handle,discord_username,region,timezone,bio,discord_roles,member_status,has_required_discord_roles,discord_verified_at,profile_public_enabled,profile_published_at,approved_avatar_media_id,approved_banner_media_id,updated_at")
    .eq("profile_public_enabled", true)
    .eq("member_status", "active")
    .eq("has_required_discord_roles", true)
    .gte("discord_verified_at", cutoff)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("list-member-profiles lookup failed", { code: error.code, message: error.message });
    return jsonResponse({ ok: false, error: "profile_lookup_failed", message: "Member profiles could not be loaded." }, 500);
  }

  const rankResources = await loadRankResources(access.adminClient);
  const profiles = await Promise.all((Array.isArray(data) ? data : []).map((profile) =>
    publicProfileDto(access.adminClient, profile, rankResources)
  ));

  return jsonResponse({
    ok: true,
    data: {
      profiles,
      count: profiles.length,
      signedUrlSeconds: 600,
    },
  });
});
