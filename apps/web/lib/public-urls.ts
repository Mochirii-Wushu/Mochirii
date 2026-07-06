import publicUrls from "@/config/public-urls.json";

export const SITE_ORIGIN = publicUrls.siteOrigin;
export const SOCIAL_HOST = publicUrls.socialHost;
export const DISCORD_INVITE_URL = publicUrls.discordInviteUrl;
export const MOCHI_PETS_DEFAULT_ORIGIN = publicUrls.mochiPetsDefaultOrigin;
export const SUPABASE_PROJECT_REF = publicUrls.supabaseProjectRef;

export function configuredMochiPetsOrigin() {
  return (process.env.NEXT_PUBLIC_MOCHI_PETS_URL || MOCHI_PETS_DEFAULT_ORIGIN).replace(/\/+$/, "");
}
