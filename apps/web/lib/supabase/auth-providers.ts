import type { Provider } from "@supabase/supabase-js";
import {
  NEXT_PUBLIC_AUTH_IDENTITY_LINK_PROVIDER_IDS,
  NEXT_PUBLIC_AUTH_PROVIDER_IDS,
  NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS,
  isSupabaseConfigured,
} from "./config";
import { resolveProviderPolicyIds } from "./auth-provider-policy-core";
import { phoneAuthConfigurationReady } from "./phone-auth-policy";

export const AUTH_PROVIDER_IDS = [
  "discord",
  "phone",
  "apple",
  "facebook",
  "google",
  "kakao",
  "twitch",
  "spotify",
] as const;

export const OAUTH_PROVIDER_IDS = [
  "discord",
  "apple",
  "facebook",
  "google",
  "kakao",
  "twitch",
  "spotify",
] as const;

export type AuthProviderId = (typeof AUTH_PROVIDER_IDS)[number];
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

export type AuthProviderConfig = {
  id: AuthProviderId;
  label: string;
  shortLabel: string;
  signInLabel: string;
  kind: "oauth" | "phone";
  scopes?: string;
  approvalRequired: boolean;
  automaticVerification: boolean;
  setupNote: string;
};

export const AUTH_PROVIDER_REGISTRY: Record<AuthProviderId, AuthProviderConfig> = {
  discord: {
    id: "discord",
    label: "Discord",
    shortLabel: "Discord",
    signInLabel: "Sign in with Discord",
    kind: "oauth",
    scopes: "identify email",
    approvalRequired: false,
    automaticVerification: true,
    setupNote: "Discord can be checked against guild membership and required roles.",
  },
  phone: {
    id: "phone",
    label: "Phone OTP",
    shortLabel: "Phone",
    signInLabel: "Continue with Phone",
    kind: "phone",
    approvalRequired: true,
    automaticVerification: false,
    setupNote: "Phone sign-in confirms access to this number; guild access still requires member verification.",
  },
  apple: {
    id: "apple",
    label: "Apple",
    shortLabel: "Apple",
    signInLabel: "Continue with Apple",
    kind: "oauth",
    approvalRequired: true,
    automaticVerification: false,
    setupNote: "Apple identity requires member review; Apple OAuth secrets need a six-month rotation cadence.",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    shortLabel: "Facebook",
    signInLabel: "Continue with Facebook",
    kind: "oauth",
    scopes: "email",
    approvalRequired: true,
    automaticVerification: false,
    setupNote: "Facebook should request email permission, then use moderator review for gallery access.",
  },
  google: {
    id: "google",
    label: "Google",
    shortLabel: "Google",
    signInLabel: "Continue with Google",
    kind: "oauth",
    scopes: "openid email profile",
    approvalRequired: true,
    automaticVerification: false,
    setupNote: "Google uses minimal OpenID/email/profile scopes and still needs member review.",
  },
  kakao: {
    id: "kakao",
    label: "Kakao",
    shortLabel: "Kakao",
    signInLabel: "Continue with Kakao",
    kind: "oauth",
    scopes: "profile_nickname profile_image",
    approvalRequired: true,
    automaticVerification: false,
    setupNote: "Kakao uses profile-only scopes unless the app is approved as a Kakao Biz App for account_email.",
  },
  twitch: {
    id: "twitch",
    label: "Twitch",
    shortLabel: "Twitch",
    signInLabel: "Log in with Twitch",
    kind: "oauth",
    approvalRequired: true,
    automaticVerification: false,
    setupNote: "Twitch is identity evidence only, not membership proof.",
  },
  spotify: {
    id: "spotify",
    label: "Spotify",
    shortLabel: "Spotify",
    signInLabel: "Log in with Spotify",
    kind: "oauth",
    approvalRequired: true,
    automaticVerification: false,
    setupNote: "Spotify is identity evidence only, not membership proof.",
  },
};

const PROVIDER_ID_SET = new Set<string>(AUTH_PROVIDER_IDS);
const OAUTH_PROVIDER_ID_SET = new Set<string>(OAUTH_PROVIDER_IDS);

function requestedProviderIds() {
  return resolveProviderPolicyIds(NEXT_PUBLIC_AUTH_PROVIDER_IDS, AUTH_PROVIDER_IDS);
}

function requestedIdentityLinkProviderIds() {
  return resolveProviderPolicyIds(NEXT_PUBLIC_AUTH_IDENTITY_LINK_PROVIDER_IDS, OAUTH_PROVIDER_IDS);
}

function requestedPlaceholderProviderIds() {
  return resolveProviderPolicyIds(NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS, AUTH_PROVIDER_IDS);
}

export function isAuthProviderId(value: unknown): value is AuthProviderId {
  return PROVIDER_ID_SET.has(String(value || ""));
}

export function isOAuthProviderId(value: unknown): value is OAuthProviderId {
  return OAUTH_PROVIDER_ID_SET.has(String(value || ""));
}

export function providerToSupabaseProvider(provider: OAuthProviderId): Provider {
  return provider as Provider;
}

export function phoneAuthReady() {
  return phoneAuthConfigurationReady({
    phoneAuthReady: process.env.NEXT_PUBLIC_PHONE_AUTH_READY === "true",
    captchaEnabled: process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true",
    captchaProvider: process.env.NEXT_PUBLIC_AUTH_CAPTCHA_PROVIDER || "",
    captchaSiteKey: process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY || "",
    supabaseConfigured: isSupabaseConfigured(),
  });
}

export function enabledAuthProviders() {
  return requestedProviderIds()
    .filter(isAuthProviderId)
    .filter((providerId) => providerId !== "phone" || phoneAuthReady())
    .map((providerId) => AUTH_PROVIDER_REGISTRY[providerId]);
}

export function enabledOAuthProviders() {
  return enabledAuthProviders().filter((provider): provider is AuthProviderConfig & { id: OAuthProviderId; kind: "oauth" } =>
    provider.kind === "oauth" && isOAuthProviderId(provider.id),
  );
}

export function enabledIdentityLinkProviders() {
  return requestedIdentityLinkProviderIds()
    .map((providerId) => AUTH_PROVIDER_REGISTRY[providerId])
    .filter((provider): provider is AuthProviderConfig & { id: OAuthProviderId; kind: "oauth" } =>
      provider.kind === "oauth" && isOAuthProviderId(provider.id),
    );
}

export function isSignInProviderEnabled(value: unknown): value is OAuthProviderId {
  return isOAuthProviderId(value)
    && enabledOAuthProviders().some(({ id }) => id === value);
}

export function isIdentityLinkProviderEnabled(value: unknown): value is OAuthProviderId {
  return isOAuthProviderId(value)
    && enabledIdentityLinkProviders().some(({ id }) => id === value);
}

export function placeholderAuthProviders() {
  const enabledIds = new Set(enabledAuthProviders().map((provider) => provider.id));
  return requestedPlaceholderProviderIds()
    .filter(isAuthProviderId)
    .filter((providerId) => !enabledIds.has(providerId))
    .map((providerId) => AUTH_PROVIDER_REGISTRY[providerId]);
}

export function placeholderOAuthProviders() {
  return placeholderAuthProviders().filter((provider): provider is AuthProviderConfig & { id: OAuthProviderId; kind: "oauth" } =>
    provider.kind === "oauth" && isOAuthProviderId(provider.id),
  );
}

export function authProviderLabels(providerIds: readonly string[]) {
  return providerIds
    .filter(isAuthProviderId)
    .map((providerId) => AUTH_PROVIDER_REGISTRY[providerId].shortLabel);
}
