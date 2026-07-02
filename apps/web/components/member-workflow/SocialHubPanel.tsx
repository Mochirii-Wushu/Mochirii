"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChange, requireAuth } from "@/lib/supabase/auth";
import { profileIsActive, verifyMemberAccess } from "@/lib/supabase/profile";
import { listMySocialAccounts } from "@/lib/supabase/social";
import { text, type MemberAccessResponse, type SocialAccount } from "@/lib/supabase/types";
import { prettyStatus } from "./format";
import { WorkflowEmptyState, WorkflowNotice } from "./WorkflowState";

function pixelfedAccount(accounts: SocialAccount[]) {
  return accounts.find((account) => text(account.provider).toLowerCase() === "pixelfed") || null;
}

function GateMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="glass-card glass-card--primary glass-pad auth-panel">
      <p className="kicker">Guild Social</p>
      <h2 className="section-title">{title}</h2>
      <p className="muted">{message}</p>
      <div className="auth-actions">
        <Link className="hero-cta hero-cta--primary" href="/auth?redirect=/social">Login</Link>
        <Link className="hero-cta" href="/account">Account</Link>
      </div>
    </section>
  );
}

export function SocialHubPanel() {
  const [busy, setBusy] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [memberAccess, setMemberAccess] = useState<MemberAccessResponse | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [message, setMessage] = useState("Checking guild social access.");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");

    const auth = await requireAuth();
    setSignedIn(Boolean(auth.ok));
    if (!auth.ok) {
      setMemberAccess(null);
      setAccounts([]);
      setMessage("Choose a sign-in method before opening the guild social doorway.");
      setBusy(false);
      return;
    }

    const access = await verifyMemberAccess();
    setMemberAccess(access.data || null);
    if (!access.ok || !profileIsActive(access.data?.profile, access.data)) {
      setAccounts([]);
      setMessage(access.message || "Active guild membership is required before opening the social doorway.");
      setBusy(false);
      return;
    }

    const social = await listMySocialAccounts();
    if (!social.ok) {
      setAccounts([]);
      setError(social.message || "Guild social status could not be loaded.");
      setMessage("Guild social status unavailable.");
      setBusy(false);
      return;
    }

    setAccounts(social.data || []);
    setMessage("Guild social access checked.");
    setBusy(false);
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

  const account = pixelfedAccount(accounts);
  const activeMember = profileIsActive(memberAccess?.profile, memberAccess);
  const activeAccount = account?.status === "active" && Boolean(account.profile_url);

  return (
    <section className="glass-card glass-card--primary glass-pad auth-panel" aria-busy={busy} aria-live="polite">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Guild Social</p>
          <h2 className="section-title">Pixelfed Doorway</h2>
        </div>
        <p className={`status-pill status-pill--${activeAccount ? "active" : activeMember ? "pending" : "warning"}`}>
          {activeAccount ? "Linked" : activeMember ? "Pending SSO" : "Locked"}
        </p>
      </div>

      <WorkflowNotice tone={activeMember ? "info" : "warning"}>{message}</WorkflowNotice>
      <div className="account-summary-grid" aria-label="Guild social status">
        <div className="account-summary-card">
          <span>Membership</span>
          <strong>{activeMember ? "Active" : "Required"}</strong>
        </div>
        <div className="account-summary-card">
          <span>Pixelfed</span>
          <strong>{account ? prettyStatus(account.status) : "Not linked"}</strong>
        </div>
        <div className="account-summary-card">
          <span>Profile link</span>
          <strong>{account?.profile_link_visible ? "Shown" : "Hidden"}</strong>
        </div>
      </div>

      {account ? (
        <div className="identity-list" aria-label="Linked guild social account">
          <article className="identity-item">
            <div>
              <strong>{text(account.username, "Pixelfed account")}</strong>
              <span>{text(account.profile_url, "Profile URL pending")}</span>
            </div>
            <small>{account.federation_enabled ? "Federation enabled" : "Federation gated"}</small>
          </article>
        </div>
      ) : (
        <WorkflowEmptyState title="No Pixelfed account yet">
          The SSO compatibility gate must pass before production Pixelfed accounts are created.
        </WorkflowEmptyState>
      )}

      <div className="auth-actions">
        {activeAccount ? (
          <a className="hero-cta hero-cta--primary" href={text(account?.profile_url)} target="_blank" rel="noopener noreferrer">
            Open Pixelfed
          </a>
        ) : null}
        <Link className="hero-cta" href="/account">Account</Link>
      </div>

      <WorkflowNotice tone="danger" role="alert" hidden={!error}>{error}</WorkflowNotice>
    </section>
  );
}
