import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  AUTH_PROVIDER_REGISTRY,
  isOAuthProviderId,
  providerToSupabaseProvider,
  type OAuthProviderId,
} from "./auth-providers";
import { requireBrowserSupabaseClient } from "./client";
import { failedResult, okResult, createResult, createError, type AuthSessionResult, type AuthUserResult } from "./types";

export async function getCurrentSession() {
  try {
    const client = requireBrowserSupabaseClient();
    const { data, error } = await client.auth.getSession();
    if (error) return failedResult<AuthSessionResult>(error);
    return okResult<AuthSessionResult>({ session: data.session || null });
  } catch (error) {
    return failedResult<AuthSessionResult>(error);
  }
}

export async function getCurrentUser() {
  try {
    const client = requireBrowserSupabaseClient();
    const { data, error } = await client.auth.getUser();
    if (error) return failedResult<AuthUserResult>(error);
    if (!data.user) {
      return createResult<AuthUserResult>({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        data: null,
        error: createError("Choose a sign-in method first."),
      });
    }
    return okResult<AuthUserResult>({ user: data.user });
  } catch (error) {
    return failedResult<AuthUserResult>(error);
  }
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  try {
    const client = requireBrowserSupabaseClient();
    return okResult(client.auth.onAuthStateChange(callback).data);
  } catch (error) {
    return failedResult(error);
  }
}

function resolveRedirectTo(value = "/account") {
  if (typeof window === "undefined") return value;
  return new URL(value, window.location.origin).href;
}

export async function signInWithProvider(provider: OAuthProviderId, options: { redirectTo?: string } = {}) {
  try {
    if (!isOAuthProviderId(provider)) throw new Error("That sign-in provider is not supported.");

    const client = requireBrowserSupabaseClient();
    const config = AUTH_PROVIDER_REGISTRY[provider];
    const { data, error } = await client.auth.signInWithOAuth({
      provider: providerToSupabaseProvider(provider),
      options: {
        redirectTo: resolveRedirectTo(options.redirectTo || "/account"),
        ...(config.scopes ? { scopes: config.scopes } : {}),
      },
    });
    if (error) return failedResult(error);
    return okResult(data);
  } catch (error) {
    return failedResult(error);
  }
}

export async function linkProviderIdentity(provider: OAuthProviderId, options: { redirectTo?: string } = {}) {
  try {
    if (!isOAuthProviderId(provider)) throw new Error("That sign-in provider is not supported.");

    const client = requireBrowserSupabaseClient();
    const config = AUTH_PROVIDER_REGISTRY[provider];
    const { data, error } = await client.auth.linkIdentity({
      provider: providerToSupabaseProvider(provider),
      options: {
        redirectTo: resolveRedirectTo(options.redirectTo || "/account"),
        ...(config.scopes ? { scopes: config.scopes } : {}),
      },
    });
    if (error) return failedResult(error);
    return okResult(data);
  } catch (error) {
    return failedResult(error);
  }
}

export async function getLinkedIdentities() {
  try {
    const client = requireBrowserSupabaseClient();
    const authWithIdentities = client.auth as typeof client.auth & {
      getUserIdentities?: () => Promise<{ data?: { identities?: unknown[] } | unknown[] | null; error?: unknown }>;
    };
    if (typeof authWithIdentities.getUserIdentities === "function") {
      const { data, error } = await authWithIdentities.getUserIdentities();
      if (error) return failedResult(error);
      const identities = Array.isArray(data) ? data : Array.isArray(data?.identities) ? data.identities : [];
      return okResult(identities);
    }

    const user = await getCurrentUser();
    if (!user.ok) return user;
    return okResult(Array.isArray(user.data?.user.identities) ? user.data.user.identities : []);
  } catch (error) {
    return failedResult(error);
  }
}

export async function signInWithPhoneOtp({
  phone,
  captchaToken,
  shouldCreateUser = true,
}: {
  phone: string;
  captchaToken?: string;
  shouldCreateUser?: boolean;
}) {
  try {
    const cleanPhone = String(phone || "").trim();
    if (!cleanPhone) throw new Error("Enter a phone number before requesting a code.");

    const client = requireBrowserSupabaseClient();
    const { data, error } = await client.auth.signInWithOtp({
      phone: cleanPhone,
      options: {
        shouldCreateUser,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    if (error) return failedResult(error);
    return okResult(data, "Code sent. Check your phone.");
  } catch (error) {
    return failedResult(error);
  }
}

export async function verifyPhoneOtp({ phone, token }: { phone: string; token: string }) {
  try {
    const cleanPhone = String(phone || "").trim();
    const cleanToken = String(token || "").trim();
    if (!cleanPhone || !cleanToken) throw new Error("Enter the phone number and verification code.");

    const client = requireBrowserSupabaseClient();
    const { data, error } = await client.auth.verifyOtp({
      phone: cleanPhone,
      token: cleanToken,
      type: "sms",
    });
    if (error) return failedResult(error);
    return okResult(data, "Phone sign-in complete.");
  } catch (error) {
    return failedResult(error);
  }
}

export async function signInWithDiscord(options: { redirectTo?: string } = {}) {
  return signInWithProvider("discord", options);
}

export async function signOut() {
  try {
    const client = requireBrowserSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) return failedResult(error);
    return okResult(true, "Signed out.");
  } catch (error) {
    return failedResult(error);
  }
}

export async function requireAuth() {
  return getCurrentUser();
}
