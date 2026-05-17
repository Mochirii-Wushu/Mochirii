import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
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
        error: createError("Sign in with Discord first."),
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

export async function signInWithDiscord(options: { redirectTo?: string } = {}) {
  try {
    const client = requireBrowserSupabaseClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: resolveRedirectTo(options.redirectTo || "/account"),
        scopes: "identify email",
      },
    });
    if (error) return failedResult(error);
    return okResult(data);
  } catch (error) {
    return failedResult(error);
  }
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
