export const MEMBER_SOCIAL_LINK_LIMIT = 20;

export const MEMBER_SOCIAL_LINK_PROVIDERS = [
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourname" },
  { id: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourname" },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourname" },
  { id: "twitch", label: "Twitch", placeholder: "https://twitch.tv/yourname" },
  { id: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourname" },
  { id: "x", label: "X", placeholder: "https://x.com/yourname" },
  { id: "bluesky", label: "Bluesky", placeholder: "https://bsky.app/profile/yourname.bsky.social" },
  { id: "mastodon", label: "Mastodon", placeholder: "https://example.social/@yourname" },
  { id: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/user/yourid" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourname" },
  { id: "custom", label: "Other profile", placeholder: "https://example.com/yourname" },
] as const;

export type MemberSocialLinkProvider = (typeof MEMBER_SOCIAL_LINK_PROVIDERS)[number]["id"];

const PROVIDER_IDS = new Set<string>(MEMBER_SOCIAL_LINK_PROVIDERS.map(({ id }) => id));
const RESERVED_CUSTOM_SUFFIXES = [
  ".example",
  ".internal",
  ".invalid",
  ".local",
  ".localhost",
  ".onion",
  ".test",
] as const;

const PATH_RULES: Record<Exclude<MemberSocialLinkProvider, "custom" | "mastodon">, RegExp> = {
  instagram: /^\/[a-z0-9._]+\/?$/i,
  facebook: /^\/[a-z0-9._-]+\/?$/i,
  tiktok: /^\/@[a-z0-9._-]+\/?$/i,
  twitch: /^\/[a-z0-9_]+\/?$/i,
  youtube: /^\/(?:@[a-z0-9._-]+|channel\/[a-z0-9_-]+|c\/[a-z0-9._-]+|user\/[a-z0-9._-]+)\/?$/i,
  x: /^\/[a-z0-9_]+\/?$/i,
  bluesky: /^\/profile\/[a-z0-9.-]+\/?$/i,
  spotify: /^\/user\/[a-z0-9]+\/?$/i,
  linkedin: /^\/(?:in|company)\/[a-z0-9._-]+\/?$/i,
};

const ALLOWED_HOSTS: Record<Exclude<MemberSocialLinkProvider, "custom" | "mastodon">, readonly string[]> = {
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
  twitch: ["twitch.tv", "www.twitch.tv"],
  youtube: ["youtube.com", "www.youtube.com"],
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  bluesky: ["bsky.app"],
  spotify: ["open.spotify.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
};

function isIpv4Hostname(hostname: string) {
  const parts = hostname.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

export function isPublicProfileHostname(hostname: string) {
  const clean = hostname.toLowerCase().replace(/\.$/, "");
  if (!clean || clean === "localhost" || clean.includes(":")) return false;
  if (isIpv4Hostname(clean)) return false;
  if (RESERVED_CUSTOM_SUFFIXES.some((suffix) => clean === suffix.slice(1) || clean.endsWith(suffix))) return false;
  if (!clean.includes(".")) return false;

  const labels = clean.split(".");
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return false;
  return /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(labels.at(-1) || "");
}

export function memberSocialLinkProviderLabel(provider: MemberSocialLinkProvider) {
  return MEMBER_SOCIAL_LINK_PROVIDERS.find(({ id }) => id === provider)?.label || "Profile";
}

export function normalizeMemberSocialLinkProvider(value: string): MemberSocialLinkProvider {
  const clean = String(value || "").trim().toLowerCase();
  if (!PROVIDER_IDS.has(clean)) throw new Error("Choose a supported profile type.");
  return clean as MemberSocialLinkProvider;
}

export function normalizeMemberSocialLinkLabel(provider: MemberSocialLinkProvider, value = "") {
  if (provider !== "custom") return memberSocialLinkProviderLabel(provider);

  const clean = String(value || "").trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("Add a short label for this profile.");
  if (clean.length > 40) throw new Error("Profile labels must be 40 characters or fewer.");
  if (!/^[\p{L}\p{N} .&'’_+()-]+$/u.test(clean)) {
    throw new Error("Profile labels may use letters, numbers, spaces, and simple punctuation.");
  }
  return clean;
}

export function normalizeMemberSocialLinkUrl(providerValue: string, value: string) {
  const provider = normalizeMemberSocialLinkProvider(providerValue);
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Add the full HTTPS profile link.");
  if (raw.length > 2048 || /[\u0000-\u001f\u007f\\]/u.test(raw)) throw new Error("Use a valid HTTPS profile link.");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Use a valid HTTPS profile link.");
  }

  if (url.protocol !== "https:") throw new Error("Profile links must use HTTPS.");
  if (url.username || url.password || url.port) throw new Error("Profile links cannot include credentials or a custom port.");
  if (url.search || url.hash) throw new Error("Remove tracking parameters and fragments from the profile link.");

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!isPublicProfileHostname(hostname)) throw new Error("Use a public profile hostname.");

  if (provider === "custom") {
    url.hostname = hostname;
  } else if (provider === "mastodon") {
    if (!/^\/(?:@[a-z0-9._-]+|users\/[a-z0-9._-]+)\/?$/i.test(url.pathname)) {
      throw new Error("Use the direct Mastodon profile URL.");
    }
    url.hostname = hostname;
  } else {
    const allowedHosts = ALLOWED_HOSTS[provider];
    if (!allowedHosts.includes(hostname)) throw new Error(`Use the direct ${memberSocialLinkProviderLabel(provider)} profile URL.`);
    if (!PATH_RULES[provider].test(url.pathname)) throw new Error(`Use the direct ${memberSocialLinkProviderLabel(provider)} profile URL.`);
    url.hostname = provider === "x" ? "x.com" : allowedHosts[0].replace(/^www\./, "");
  }

  const pathname = url.pathname.replace(/\/{2,}/g, "/");
  url.pathname = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  return url.toString();
}

export function normalizeMemberSocialLinkInput({
  provider: providerValue,
  profileUrl,
  displayLabel,
}: {
  provider: string;
  profileUrl: string;
  displayLabel?: string;
}) {
  const provider = normalizeMemberSocialLinkProvider(providerValue);
  return {
    provider,
    displayLabel: normalizeMemberSocialLinkLabel(provider, displayLabel),
    profileUrl: normalizeMemberSocialLinkUrl(provider, profileUrl),
  };
}
