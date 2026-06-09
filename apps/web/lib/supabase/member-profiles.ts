"use client";

import { invokeEdgeFunction, requireBrowserSupabaseClient } from "./client";
import { getCurrentUser } from "./auth";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PROFILE_AVATAR_BYTES,
  MAX_PROFILE_BANNER_BYTES,
  MEMBER_PROFILE_MEDIA_BUCKET,
} from "./config";
import { failedResult, okResult, text, type MemberProfileMedia, type ProfileMediaKind, type ProfileMediaQueue, type PublicMemberProfileList, type PublicMemberProfileResponse } from "./types";
import type { VisibleProfileCardsResponse } from "./types";

function safeFileName(name: string) {
  const clean = String(name || "profile-image").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return clean || "profile-image";
}

function mediaLimit(kind: ProfileMediaKind) {
  return kind === "avatar" ? MAX_PROFILE_AVATAR_BYTES : MAX_PROFILE_BANNER_BYTES;
}

export async function listPublishedMemberProfiles() {
  return invokeEdgeFunction<PublicMemberProfileList>("list-member-profiles", {});
}

export async function getPublishedMemberProfile(slug: string) {
  return invokeEdgeFunction<PublicMemberProfileResponse>("get-member-profile", { slug });
}

export async function listVisibleProfileCards(slugs: string[]) {
  const cleanSlugs = Array.from(new Set(slugs.map((slug) => text(slug).toLowerCase()).filter(Boolean))).slice(0, 12);
  if (!cleanSlugs.length) return okResult<VisibleProfileCardsResponse>({ profiles: [], count: 0 });
  return invokeEdgeFunction<VisibleProfileCardsResponse>("list-visible-profile-cards", { slugs: cleanSlugs });
}

export async function listMyProfileMedia() {
  try {
    const client = requireBrowserSupabaseClient();
    const userResult = await getCurrentUser();
    const user = userResult.data?.user;
    if (!userResult.ok || !user) throw new Error("Sign in before loading profile images.");

    const { data, error, status, statusText } = await client
      .from("member_profile_media")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return {
        ok: false,
        status,
        statusText,
        data: null,
        error: { message: error.message, details: error },
        message: error.message,
      };
    }

    return okResult((Array.isArray(data) ? data : []) as MemberProfileMedia[]);
  } catch (error) {
    return failedResult<MemberProfileMedia[]>(error, []);
  }
}

export async function updateProfileVisibility(profilePublicEnabled: boolean) {
  try {
    const client = requireBrowserSupabaseClient();
    const userResult = await getCurrentUser();
    const user = userResult.data?.user;
    if (!userResult.ok || !user) throw new Error("Sign in before updating profile visibility.");

    const { data, error, status, statusText } = await client
      .from("member_profiles")
      .update({ profile_public_enabled: profilePublicEnabled })
      .eq("id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        status,
        statusText,
        data: null,
        error: { message: error.message, details: error },
        message: error.message,
      };
    }

    return okResult(data, profilePublicEnabled ? "Profile visibility enabled." : "Profile visibility disabled.");
  } catch (error) {
    return failedResult(error);
  }
}

export async function uploadProfileMedia(kind: ProfileMediaKind, file: File) {
  try {
    if (kind !== "avatar" && kind !== "banner") throw new Error("Choose avatar or banner.");
    if (!file) throw new Error("Choose an image file.");
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      throw new Error("Upload a JPEG, PNG, or WebP image.");
    }
    if (file.size <= 0 || file.size > mediaLimit(kind)) {
      throw new Error(`${kind === "avatar" ? "Avatar" : "Banner"} image is over the size limit.`);
    }

    const client = requireBrowserSupabaseClient();
    const userResult = await getCurrentUser();
    const user = userResult.data?.user;
    if (!userResult.ok || !user) throw new Error("Sign in before uploading profile images.");

    const storagePath = `${user.id}/${kind}/${Date.now()}-${safeFileName(file.name)}`;
    const upload = await client.storage
      .from(MEMBER_PROFILE_MEDIA_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (upload.error) throw upload.error;

    const result = await invokeEdgeFunction<{ media?: MemberProfileMedia }>("submit-member-profile-media", {
      kind,
      storageBucket: MEMBER_PROFILE_MEDIA_BUCKET,
      storagePath,
      mimeType: file.type,
      sizeBytes: file.size,
      originalFilename: text(file.name, `${kind}-image`),
    });

    if (!result.ok) return result;
    return result;
  } catch (error) {
    return failedResult(error);
  }
}

export async function listProfileMediaQueue(status = "pending") {
  return invokeEdgeFunction<ProfileMediaQueue>("list-member-profile-media-queue", { status });
}

export async function moderateProfileMedia(mediaId: string, action: "approved" | "rejected", reason = "") {
  const cleanMediaId = text(mediaId);
  if (!cleanMediaId) return failedResult("Choose profile media before moderating.");
  if (action === "rejected" && reason.trim().length < 2) return failedResult("Add a decline reason before rejecting profile media.");

  return invokeEdgeFunction("moderate-member-profile-media", {
    media_id: cleanMediaId,
    action,
    reason: reason.trim().slice(0, 500),
  });
}
