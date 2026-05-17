"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser, onAuthStateChange, signInWithDiscord, signOut } from "@/lib/supabase/auth";
import { signedInName } from "@/lib/supabase/profile";
import type { User } from "@supabase/supabase-js";

export function AuthPanel() {
  const [busy, setBusy] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState("Checking your current session.");
  const [error, setError] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    const result = await getCurrentUser();
    const currentUser = result.ok ? result.data?.user || null : null;
    setUser(currentUser);
    setStatus(
      currentUser
        ? `Signed in as ${signedInName(currentUser)}. Open Account to check Discord role verification.`
        : "Use Discord to sign in. No password signup is used here.",
    );
    setBusy(false);
  }

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const subscription = onAuthStateChange(() => {
      void load();
    });
    return () => {
      subscription.data?.subscription?.unsubscribe();
    };
  }, []);

  async function login() {
    setBusy(true);
    setError("");
    setStatus("Opening Discord sign-in.");
    const result = await signInWithDiscord({ redirectTo: "/account" });
    if (!result.ok) {
      setError(result.message || "Discord sign-in could not start.");
      setStatus("");
      setBusy(false);
    }
  }

  async function endSession() {
    setBusy(true);
    setError("");
    const result = await signOut();
    if (!result.ok) setError(result.message || "Sign out failed.");
    await load();
  }

  const signedIn = Boolean(user);

  return (
    <section className="glass-card glass-card--primary glass-pad auth-panel" aria-labelledby="authTitle">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Discord Auth</p>
          <h2 className="section-title" id="authTitle">Website Sign-In</h2>
        </div>
        <p className="status-pill" id="authState">{busy ? "Checking" : signedIn ? "Signed in" : "Signed out"}</p>
      </div>

      <div className="prose-stack auth-copy">
        <p>
          Sign in with Discord to create or open your website account. Discord login proves identity only; upload access
          still requires guild membership, completed Discord onboarding, and both required roles.
        </p>
      </div>

      <div className="auth-actions" aria-label="Authentication actions">
        {!signedIn ? (
          <button className="hero-cta hero-cta--primary" type="button" onClick={login} disabled={busy}>
            Login with Discord
          </button>
        ) : null}
        {signedIn ? (
          <>
            <Link className="hero-cta" href="/account">Open Account</Link>
            <button className="hero-cta" type="button" onClick={endSession} disabled={busy}>Sign out</button>
          </>
        ) : null}
      </div>

      <p className="auth-status muted" id="authStatus" role="status" aria-live="polite">
        {status}
      </p>
      <p className="auth-error" id="authError" role="alert" hidden={!error}>
        {error}
      </p>
    </section>
  );
}
