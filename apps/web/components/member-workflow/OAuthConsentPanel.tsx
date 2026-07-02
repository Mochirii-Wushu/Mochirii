"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentSession, onAuthStateChange } from "@/lib/supabase/auth";
import { requireBrowserSupabaseClient } from "@/lib/supabase/client";
import { profileIsActive, verifyMemberAccess } from "@/lib/supabase/profile";
import { text, type MemberAccessResponse } from "@/lib/supabase/types";
import { WorkflowNotice } from "./WorkflowState";

type AuthorizationDetails = {
  authorization_id?: string;
  redirect_url?: string;
  redirect_uri?: string;
  scope?: string;
  client?: {
    name?: string;
    client_name?: string;
    id?: string;
    client_id?: string;
  };
};

function scopeList(scope: unknown) {
  return text(scope)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function consentLoginHref(authorizationId: string) {
  return `/auth?redirect=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`;
}

export function OAuthConsentPanel() {
  const searchParams = useSearchParams();
  const authorizationId = text(searchParams.get("authorization_id"));
  const loginHref = useMemo(() => consentLoginHref(authorizationId), [authorizationId]);
  const [busy, setBusy] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [memberAccess, setMemberAccess] = useState<MemberAccessResponse | null>(null);
  const [status, setStatus] = useState("Checking authorization request.");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");

    if (!authorizationId) {
      setSignedIn(false);
      setDetails(null);
      setStatus("");
      setError("Missing authorization request.");
      setBusy(false);
      return;
    }

    const sessionResult = await getCurrentSession();
    const session = sessionResult.data?.session || null;
    setSignedIn(Boolean(session));
    if (!session) {
      setDetails(null);
      setStatus("Sign in before authorizing guild social access.");
      setBusy(false);
      return;
    }

    const client = requireBrowserSupabaseClient();
    const { data, error: detailsError } = await client.auth.oauth.getAuthorizationDetails(authorizationId);
    if (detailsError || !data) {
      setDetails(null);
      setStatus("");
      setError(detailsError?.message || "Authorization request could not be loaded.");
      setBusy(false);
      return;
    }

    const nextDetails = data as AuthorizationDetails;
    if (!("authorization_id" in nextDetails) && nextDetails.redirect_url) {
      window.location.assign(nextDetails.redirect_url);
      return;
    }

    const access = await verifyMemberAccess();
    const nextAccess = access.data || null;
    const nextActiveMember = profileIsActive(nextAccess?.profile, nextAccess);
    setMemberAccess(nextAccess);
    setDetails(nextDetails);
    setStatus(
      nextActiveMember
        ? "Authorization request ready."
        : access.message || "Active guild membership is required before authorizing guild social access.",
    );
    setBusy(false);
  }, [authorizationId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const subscription = onAuthStateChange(() => {
      void load();
    });
    return () => subscription.data?.subscription?.unsubscribe();
  }, [load]);

  async function decide(decision: "approve" | "deny") {
    setBusy(true);
    setError("");
    setStatus(decision === "approve" ? "Approving authorization." : "Denying authorization.");

    const sessionResult = await getCurrentSession();
    const token = sessionResult.data?.session?.access_token || "";
    if (!token) {
      setError("Sign in again before continuing.");
      setStatus("");
      setBusy(false);
      return;
    }

    const response = await fetch("/api/oauth/decision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ authorization_id: authorizationId, decision }),
    });
    const payload = await response.json().catch(() => ({})) as { redirectUrl?: string; error?: string };
    if (!response.ok || !payload.redirectUrl) {
      setError(payload.error || "Authorization decision failed.");
      setStatus("");
      setBusy(false);
      return;
    }

    window.location.assign(payload.redirectUrl);
  }

  const scopes = scopeList(details?.scope);
  const clientName = text(details?.client?.name || details?.client?.client_name, "Guild social client");
  const activeMember = profileIsActive(memberAccess?.profile, memberAccess);

  return (
    <section className="glass-card glass-card--primary glass-pad auth-panel" aria-busy={busy} aria-live="polite">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">OAuth Consent</p>
          <h2 className="section-title">Authorize {clientName}</h2>
        </div>
        <p className={`status-pill status-pill--${activeMember ? "active" : signedIn ? "pending" : "warning"}`}>
          {activeMember ? "Active" : signedIn ? "Review" : "Sign in"}
        </p>
      </div>

      {!signedIn ? (
        <div className="auth-actions">
          <Link className="hero-cta hero-cta--primary" href={loginHref}>Login</Link>
        </div>
      ) : null}

      {details ? (
        <dl className="status-grid" aria-label="OAuth authorization request">
          <div>
            <dt>Client</dt>
            <dd>{clientName}</dd>
          </div>
          <div>
            <dt>Redirect URI</dt>
            <dd>{text(details.redirect_uri, "Not provided")}</dd>
          </div>
          <div>
            <dt>Scopes</dt>
            <dd>{scopes.length ? scopes.join(", ") : "None requested"}</dd>
          </div>
          <div>
            <dt>Member access</dt>
            <dd>{activeMember ? "Active" : "Required"}</dd>
          </div>
        </dl>
      ) : null}

      <WorkflowNotice tone={activeMember ? "success" : "warning"}>{status || "Authorization status unavailable."}</WorkflowNotice>
      <WorkflowNotice tone="danger" role="alert" hidden={!error}>{error}</WorkflowNotice>

      <div className="auth-actions">
        <button className="hero-cta hero-cta--primary" type="button" disabled={busy || !signedIn || !activeMember || !details} onClick={() => void decide("approve")}>
          Approve
        </button>
        <button className="hero-cta" type="button" disabled={busy || !signedIn || !details} onClick={() => void decide("deny")}>
          Deny
        </button>
      </div>
    </section>
  );
}
