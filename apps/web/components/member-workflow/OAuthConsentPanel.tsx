"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  classifyAuthorizationDetailsFailure,
  type AuthorizationDetailsFailureKind,
} from "@/lib/oauth/authorization-details-error";
import { approvedSocialOAuthRedirect } from "@/lib/oauth/approved-social-redirect";
import {
  createAuthorizationLoadQueue,
  type AuthorizationLoadQueue,
} from "@/lib/oauth/authorization-load-queue";
import { oauthConsentLoginHref } from "@/lib/oauth/consent-login-url";
import { priorConsentRedirect } from "@/lib/oauth/prior-consent-redirect";
import { SOCIAL_HOST } from "@/lib/public-urls";
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

export function OAuthConsentPanel() {
  const searchParams = useSearchParams();
  const authorizationId = text(searchParams.get("authorization_id"));
  const loginHref = useMemo(() => oauthConsentLoginHref(authorizationId), [authorizationId]);
  const [busy, setBusy] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [memberAccess, setMemberAccess] = useState<MemberAccessResponse | null>(null);
  const [status, setStatus] = useState("Checking authorization request.");
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<AuthorizationDetailsFailureKind | "missing" | "">("");
  const loadQueueRef = useRef<AuthorizationLoadQueue | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    setErrorKind("");
    setDetails(null);
    setMemberAccess(null);

    try {
      if (!authorizationId) {
        setSignedIn(false);
        setStatus("");
        setError("This sign-in request is missing. Return to Mochirii Social and start again.");
        setErrorKind("missing");
        return;
      }

      const sessionResult = await getCurrentSession();
      if (!sessionResult.ok) {
        setSignedIn(false);
        setStatus("");
        setError("We couldn't check your Mochirii sign-in. Sign in again, then retry.");
        setErrorKind("session");
        return;
      }

      const session = sessionResult.data?.session || null;
      setSignedIn(Boolean(session));
      if (!session) {
        setStatus("Sign in before authorizing guild social access.");
        return;
      }

      const client = requireBrowserSupabaseClient();
      const { data, error: detailsError } = await client.auth.oauth.getAuthorizationDetails(authorizationId);
      if (detailsError || !data) {
        const failure = classifyAuthorizationDetailsFailure(detailsError);
        setStatus("");
        setError(failure.message);
        setErrorKind(failure.kind);
        return;
      }

      const nextDetails = data as AuthorizationDetails;
      const access = await verifyMemberAccess();
      if (!access.ok || !access.data) {
        setStatus("");
        setError("We couldn't verify guild membership. Try again.");
        setErrorKind("temporary");
        return;
      }

      const nextAccess = access.data;
      const nextActiveMember = profileIsActive(nextAccess.profile, nextAccess);
      const redirectUrl = priorConsentRedirect(nextDetails, nextActiveMember);
      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }

      setMemberAccess(nextAccess);
      setDetails(nextDetails);
      setStatus(
        nextActiveMember
          ? "Authorization request ready."
          : "Active guild membership is required before authorizing guild social access.",
      );
    } catch {
      setDetails(null);
      setMemberAccess(null);
      setStatus("");
      setError("We couldn't load this authorization request. Try again.");
      setErrorKind("temporary");
    } finally {
      setBusy(false);
    }
  }, [authorizationId]);

  useEffect(() => {
    const queue = createAuthorizationLoadQueue(load);
    loadQueueRef.current = queue;
    void queue.request();
    const subscription = onAuthStateChange(() => {
      void queue.request();
    });
    return () => {
      queue.stop();
      if (loadQueueRef.current === queue) loadQueueRef.current = null;
      subscription.data?.subscription?.unsubscribe();
    };
  }, [load]);

  async function decide(decision: "approve" | "deny") {
    setBusy(true);
    setError("");
    setStatus(decision === "approve" ? "Approving authorization." : "Denying authorization.");

    try {
      const sessionResult = await getCurrentSession();
      const token = sessionResult.ok ? sessionResult.data?.session?.access_token || "" : "";
      if (!token) {
        setMemberAccess(null);
        setError("Sign in again before continuing.");
        setErrorKind("session");
        setStatus("");
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
      const payload = await response.json().catch(() => ({})) as { redirectUrl?: string };
      const redirectUrl = approvedSocialOAuthRedirect(payload.redirectUrl);
      if (!response.ok || !redirectUrl) {
        setError("Authorization decision could not be completed. Try again.");
        setErrorKind("temporary");
        setStatus("");
        return;
      }

      window.location.assign(redirectUrl);
    } catch {
      setError("Authorization decision could not be completed. Try again.");
      setErrorKind("temporary");
      setStatus("");
    } finally {
      setBusy(false);
    }
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

      {errorKind === "temporary" ? (
        <div className="auth-actions">
          <button className="hero-cta" type="button" disabled={busy} onClick={() => void loadQueueRef.current?.request()}>
            Try again
          </button>
        </div>
      ) : null}

      {errorKind === "session" ? (
        <div className="auth-actions">
          <Link className="hero-cta hero-cta--primary" href={loginHref}>Login again</Link>
        </div>
      ) : null}

      {errorKind === "expired" || errorKind === "missing" ? (
        <div className="auth-actions">
          <a className="hero-cta" href={SOCIAL_HOST}>Return to Mochirii Social</a>
        </div>
      ) : null}

      {details ? (
        <div className="auth-actions">
          <button className="hero-cta hero-cta--primary" type="button" disabled={busy || !signedIn || !activeMember} onClick={() => void decide("approve")}>
            Approve
          </button>
          <button className="hero-cta" type="button" disabled={busy || !signedIn} onClick={() => void decide("deny")}>
            Deny
          </button>
        </div>
      ) : null}
    </section>
  );
}
