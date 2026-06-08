export const SUPABASE_PROJECT_REF = "deyvmtncimmcinldjyqe";
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const NEXT_PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");

export const DISCORD_GUILD_ID = "1078630751077142608";
export const DISCORD_REQUIRED_ROLE_IDS = ["1468659807736299520", "1078630751077142615"] as const;
export const DISCORD_REQUIRED_ROLE_NAMES = ["Mōchirīī - WWM", "✅Verified"] as const;
export const MEMBER_GALLERY_BUCKET = "member-gallery";
export const MEMBER_PROFILE_MEDIA_BUCKET = "member-profile-media";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_PROFILE_AVATAR_BYTES = 50 * 1024 * 1024;
export const MAX_PROFILE_BANNER_BYTES = 50 * 1024 * 1024;
export const RECENT_VERIFICATION_MS = 7 * 24 * 60 * 60 * 1000;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const INSTAGRAM_WEBSITE_OPT_IN_COPY_VERSION = "2026-06-website-upload-v1";

export const SAFE_PROFILE_FIELDS = {
  display_name: { max: 40, min: 2, required: true },
  game_uid: { max: 40 },
  region: { max: 80 },
  timezone: { max: 80 },
  bio: { max: 1000 },
} as const;

export const SUBMISSION_FIELDS = {
  title: 80,
  caption: 300,
  category: 40,
} as const;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabasePublicConfig() {
  return {
    projectRef: SUPABASE_PROJECT_REF,
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
    siteUrl: NEXT_PUBLIC_SITE_URL,
    discordGuildId: DISCORD_GUILD_ID,
    requiredRoleIds: [...DISCORD_REQUIRED_ROLE_IDS],
    requiredRoleNames: [...DISCORD_REQUIRED_ROLE_NAMES],
    memberGalleryBucket: MEMBER_GALLERY_BUCKET,
    memberProfileMediaBucket: MEMBER_PROFILE_MEDIA_BUCKET,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    maxProfileAvatarBytes: MAX_PROFILE_AVATAR_BYTES,
    maxProfileBannerBytes: MAX_PROFILE_BANNER_BYTES,
    acceptedImageTypes: [...ACCEPTED_IMAGE_TYPES],
    recentVerificationMs: RECENT_VERIFICATION_MS,
    isConfigured: isSupabaseConfigured(),
  };
}
