import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const publicUrls = JSON.parse(readFileSync(resolve(root, "apps/web/config/public-urls.json"), "utf8"));

export const SITE_ORIGIN = publicUrls.siteOrigin;
export const SOCIAL_HOST = publicUrls.socialHost;
export const DISCORD_INVITE_URL = publicUrls.discordInviteUrl;
export const MOCHI_PETS_DEFAULT_ORIGIN = publicUrls.mochiPetsDefaultOrigin;
export const SUPABASE_PROJECT_REF = publicUrls.supabaseProjectRef;
export const SUPABASE_PROJECT_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const SUPABASE_AUTH_CALLBACK_URL = `${SUPABASE_PROJECT_URL}/auth/v1/callback`;
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_PROJECT_URL}/functions/v1`;

export function configuredMochiPetsOrigin(env = process.env) {
  return (env.NEXT_PUBLIC_MOCHI_PETS_URL || MOCHI_PETS_DEFAULT_ORIGIN).replace(/\/+$/, "");
}

export function siteUrl(path = "") {
  return new URL(path || "/", SITE_ORIGIN).href.replace(/\/$/, path ? "" : "/");
}

export function supabaseProjectUrl(projectRef = SUPABASE_PROJECT_REF) {
  return `https://${projectRef}.supabase.co`;
}

export function supabaseFunctionsUrl(projectRef = SUPABASE_PROJECT_REF) {
  return `${supabaseProjectUrl(projectRef)}/functions/v1`;
}
