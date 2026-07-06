"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SOCIAL_HOST } from "@/lib/public-urls";
import { onAuthStateChange, requireAuth } from "@/lib/supabase/auth";
import { WorkflowEmptyState, WorkflowNotice } from "./WorkflowState";

function GateMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="glass-card glass-card--primary glass-pad auth-panel">
      <p className="kicker">Guild Social</p>
      <h2 className="section-title">{title}</h2>
      <p className="muted">{message}</p>
      <div className="auth-actions">
        <a className="hero-cta hero-cta--primary" href={SOCIAL_HOST}>Open Mochirii Social</a>
        <Link className="hero-cta" href="/auth?redirect=/social">Website Login</Link>
      </div>
    </section>
  );
}

export function SocialHubPanel() {
  const [busy, setBusy] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("Checking website sign-in before opening Mochirii Social.");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");

    const auth = await requireAuth();
    setSignedIn(Boolean(auth.ok));
    if (!auth.ok) {
      setMessage("Sign in on Mochirii before opening the guild social platform.");
      setBusy(false);
      return;
    }

    setMessage("Opening Mochirii Social.");
    window.location.assign(SOCIAL_HOST);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const subscription = onAuthStateChange(() => {
      void load();
    });
    return () => subscription.data?.subscription?.unsubscribe();
  }, [load]);

  if (!signedIn && !busy) {
    return <GateMessage title="Sign In Required" message={message} />;
  }

  return (
    <section className="glass-card glass-card--primary glass-pad auth-panel" aria-busy={busy} aria-live="polite">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Guild Social</p>
          <h2 className="section-title">Mochirii Social Handoff</h2>
        </div>
        <p className={`status-pill status-pill--${signedIn ? "active" : "pending"}`}>
          {signedIn ? "Opening" : "Checking"}
        </p>
      </div>

      <WorkflowNotice>{message}</WorkflowNotice>
      <WorkflowEmptyState title="Opening Mochirii Social">
        Signed-in members are sent to the guild social platform automatically. Use the button if your browser does not continue.
      </WorkflowEmptyState>

      <div className="auth-actions">
        <a className="hero-cta hero-cta--primary" href={SOCIAL_HOST}>Open Mochirii Social</a>
        <Link className="hero-cta" href="/account">Account</Link>
      </div>

      <WorkflowNotice tone="danger" role="alert" hidden={!error}>{error}</WorkflowNotice>
    </section>
  );
}
