import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const publicUrls = JSON.parse(readFileSync(resolve(root, "apps/web/config/public-urls.json"), "utf8"));

export const SITE_ORIGIN = publicUrls.siteOrigin;
export const SOCIAL_HOST = publicUrls.socialHost;
export const DISCORD_INVITE_URL = publicUrls.discordInviteUrl;
export const MOCHI_PETS_DEFAULT_ORIGIN = publicUrls.mochiPetsDefaultOrigin;
export const SUPABASE_PROJECT_REF = publicUrls.supabaseProjectRef;

export function configuredMochiPetsOrigin(env = process.env) {
  return (env.NEXT_PUBLIC_MOCHI_PETS_URL || MOCHI_PETS_DEFAULT_ORIGIN).replace(/\/+$/, "");
}
