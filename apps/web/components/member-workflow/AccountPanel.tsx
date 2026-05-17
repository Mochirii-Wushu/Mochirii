"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { getCurrentProfile, profileHasVerifiedRoles, signedInName, updateCurrentProfile, verifyDiscordMembership } from "@/lib/supabase/profile";
import { listMyGallerySubmissions } from "@/lib/supabase/gallery-submissions";
import { checkLeaderGalleryModerationAccess } from "@/lib/supabase/moderation";
import { onAuthStateChange, requireAuth, signOut } from "@/lib/supabase/auth";
import { type EditableProfilePayload, type GallerySubmission, type MemberProfile, text } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";
import {
  coreProfileFields,
  countSubmissions,
  displayName,
  editableProfileFields,
  formatDate,
  formatDateShort,
  optionalProfileFields,
  prettyStatus,
  profileCompletion,
  submissionStatuses,
  uploadAccess,
} from "./format";

type FormState = Record<(typeof editableProfileFields)[number], string>;

const emptyFormState = editableProfileFields.reduce((memo, field) => {
  memo[field] = "";
  return memo;
}, {} as FormState);

function StatusPill({ children, tone = "muted" }: { children: string; tone?: string }) {
  return <p className={`status-pill status-pill--${tone}`}>{children}</p>;
}

function SubmissionStatus({ status }: { status?: string | null }) {
  const value = text(status, "pending").toLowerCase();
  return <span className={`submission-status submission-status--${value}`}>{value}</span>;
}

function SubmissionItem({ item }: { item: GallerySubmission }) {
  const title = text(item.title || item.original_filename, "Untitled image");

  return (
    <article className="submission-item">
      <div className="submission-item__head">
        <h3>{title}</h3>
        <SubmissionStatus status={item.status} />
      </div>
      {item.caption ? <p>{item.caption}</p> : null}
      {item.rejection_reason ? <p className="submission-reason">Reason: {item.rejection_reason}</p> : null}
      <div className="submission-meta">
        <span>Submitted {formatDateShort(item.created_at)}</span>
        {item.reviewed_at ? <span>Reviewed {formatDateShort(item.reviewed_at)}</span> : null}
        {item.category ? <span>{item.category}</span> : null}
      </div>
    </article>
  );
}

function formStateFromProfile(profile: MemberProfile | null): FormState {
  return editableProfileFields.reduce((memo, field) => {
    memo[field] = text(profile?.[field], "");
    return memo;
  }, {} as FormState);
}

export function AccountPanel() {
  const [busy, setBusy] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [submissions, setSubmissions] = useState<GallerySubmission[]>([]);
  const [moderatorAvailable, setModeratorAvailable] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [submissionsError, setSubmissionsError] = useState("");

  const loadSubmissions = useCallback(async () => {
    setSubmissionsError("");
    const result = await listMyGallerySubmissions();
    if (!result.ok) {
      setSubmissions([]);
      setSubmissionsError(result.message || "Gallery submissions could not be loaded.");
      return;
    }
    setSubmissions(Array.isArray(result.data) ? result.data : []);
  }, []);

  const loadAccount = useCallback(async () => {
    setBusy(true);
    setVerifyError("");
    setProfileError("");
    setSubmissionsError("");
    setProfileStatus("");

    const auth = await requireAuth();
    if (!auth.ok || !auth.data?.user) {
      setUser(null);
      setProfile(null);
      setSubmissions([]);
      setModeratorAvailable(false);
      setBusy(false);
      return;
    }

    setUser(auth.data.user);
    const profileResult = await getCurrentProfile();
    if (!profileResult.ok) {
      setProfile(null);
      setModeratorAvailable(false);
      setVerifyError(profileResult.message || "Profile could not be loaded.");
      setBusy(false);
      return;
    }

    const nextProfile = profileResult.data || null;
    setProfile(nextProfile);
    setFormState(formStateFromProfile(nextProfile));
    await loadSubmissions();

    const moderation = await checkLeaderGalleryModerationAccess();
    setModeratorAvailable(moderation.ok === true);
    setBusy(false);
  }, [loadSubmissions]);

  useEffect(() => {
    void Promise.resolve().then(() => loadAccount());
    const subscription = onAuthStateChange(() => {
      void loadAccount();
    });
    return () => {
      subscription.data?.subscription?.unsubscribe();
    };
  }, [loadAccount]);

  async function verifyDiscord() {
    setBusy(true);
    setVerifyError("");
    setVerifyStatus("Checking Discord membership and required roles.");
    const result = await verifyDiscordMembership();
    const message = result.ok
      ? result.data?.message || result.message || "Discord verification checked."
      : result.message || "Discord verification failed.";
    await loadAccount();

    if (!result.ok) {
      setVerifyError(message);
      setVerifyStatus("");
    } else {
      setVerifyStatus(message);
    }
    setBusy(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");
    setProfileStatus("Saving profile.");
    setBusy(true);

    const payload = editableProfileFields.reduce((memo, field) => {
      memo[field] = formState[field];
      return memo;
    }, {} as EditableProfilePayload);

    const result = await updateCurrentProfile(payload);
    if (!result.ok) {
      setProfileError(result.message || "Profile could not be saved.");
      setProfileStatus("");
    } else {
      setProfile(result.data || null);
      setFormState(formStateFromProfile(result.data || null));
      setProfileStatus("Profile saved.");
    }
    setBusy(false);
  }

  async function endSession() {
    setBusy(true);
    await signOut();
    window.location.href = "/auth";
  }

  if (!user) {
    return (
      <section className="glass-card glass-card--primary glass-pad auth-panel" id="signedOutPanel">
        <p className="kicker">Sign In Required</p>
        <h2 className="section-title">Login with Discord</h2>
        <p className="muted">A website account is required before Discord membership and role verification can be checked.</p>
        <div className="auth-actions">
          <Link className="hero-cta hero-cta--primary" href="/auth">Login</Link>
        </div>
      </section>
    );
  }

  const access = uploadAccess(profile);
  const completion = profileCompletion(profile);
  const hasRoles = profile?.has_required_discord_roles === true;
  const recentRoles = profileHasVerifiedRoles(profile);
  const counts = countSubmissions(submissions);

  return (
    <div className="grid-12 grid-gap" id="accountPanel">
      <section className="col-8 account-main">
        <div className="glass-card glass-card--primary glass-pad auth-panel account-overview-card">
          <div className="auth-panel__head">
            <div>
              <p className="kicker">Account Overview</p>
              <h2 className="section-title">Member State</h2>
            </div>
            <StatusPill tone={access.ok ? "active" : access.tone}>{access.ok ? "Active" : prettyStatus(profile?.member_status)}</StatusPill>
          </div>

          <dl className="status-grid account-overview-grid" aria-label="Account overview">
            <div>
              <dt>Display name</dt>
              <dd>{displayName(user, profile)}</dd>
            </div>
            <div>
              <dt>Discord identity</dt>
              <dd>{signedInName(user, profile)}</dd>
            </div>
            <div>
              <dt>Member status</dt>
              <dd>{prettyStatus(profile?.member_status)}</dd>
            </div>
            <div>
              <dt>Upload eligibility</dt>
              <dd>{access.label}</dd>
            </div>
            <div>
              <dt>Last Discord check</dt>
              <dd>{formatDate(profile?.discord_checked_at)}</dd>
            </div>
            <div>
              <dt>Profile setup</dt>
              <dd>{completion.complete} / {completion.total} core fields complete</dd>
            </div>
          </dl>

          <p className="auth-status muted" role="status" aria-live="polite">{access.guidance}</p>
        </div>

        <div className="glass-card glass-card--primary glass-pad auth-panel">
          <div className="auth-panel__head">
            <div>
              <p className="kicker">Verification</p>
              <h2 className="section-title">Discord Access</h2>
            </div>
          </div>

          <dl className="status-grid" aria-label="Account verification status">
            <div>
              <dt>Discord verification</dt>
              <dd>{recentRoles ? "Recently verified" : hasRoles ? "Verification expired" : "Needs verification"}</dd>
            </div>
            <div>
              <dt>Required roles</dt>
              <dd>{hasRoles ? "Both required roles verified" : "Required roles not verified"}</dd>
            </div>
            <div>
              <dt>Moderator access</dt>
              <dd>{moderatorAvailable ? "Moderator access available" : "Not available"}</dd>
            </div>
            <div>
              <dt>Next step</dt>
              <dd>{access.next}</dd>
            </div>
          </dl>

          <div className="account-action-grid" aria-label="Account actions">
            <button className="account-action-card account-action-card--button" type="button" onClick={verifyDiscord} disabled={busy}>
              <span>Check Verification</span>
              <small>Refresh Discord membership and role status.</small>
            </button>
            {access.ok ? (
              <Link className="account-action-card" href="/gallery-submit">
                <span>Submit Image</span>
                <small>Send an image to the private review queue.</small>
              </Link>
            ) : null}
            <Link className="account-action-card" href="/gallery">
              <span>Public Gallery</span>
              <small>View approved images and gallery sorting.</small>
            </Link>
            <a className="account-action-card" href="https://discord.com/invite/dPafqMwWPK" target="_blank" rel="noopener noreferrer">
              <span>Join Discord</span>
              <small>Open the live guild hub.</small>
            </a>
            {moderatorAvailable ? (
              <Link className="account-action-card" href="/leader-dashboard">
                <span>Leader Dashboard</span>
                <small>Review member gallery submissions.</small>
              </Link>
            ) : null}
            <button className="account-action-card account-action-card--button" type="button" onClick={endSession} disabled={busy}>
              <span>Sign Out</span>
              <small>End this browser session.</small>
            </button>
          </div>

          <div className="requirement-list" aria-label="Upload access requirements">
            <h3 className="section-title section-title--sm">Upload access needs</h3>
            <ul className="list-stack">
              <li>Join the Discord server.</li>
              <li>Complete Discord server verification.</li>
              <li>Have Mōchirīī - WWM.</li>
              <li>Have ✅Verified.</li>
            </ul>
          </div>

          <p className="auth-status muted" id="verifyStatus" role="status" aria-live="polite">{verifyStatus}</p>
          <p className="auth-error" id="verifyError" role="alert" hidden={!verifyError}>{verifyError}</p>
        </div>

        <section className="glass-card glass-card--primary glass-pad auth-panel" aria-labelledby="accountSubmissionsTitle">
          <div className="auth-panel__head">
            <div>
              <p className="kicker">My Gallery</p>
              <h2 className="section-title" id="accountSubmissionsTitle">Submission Summary</h2>
            </div>
            <Link className="hero-cta" href="/gallery-submit">Open Upload Page</Link>
          </div>

          <div className="account-summary-grid" id="gallerySubmissionSummary" aria-label="Gallery submission status summary">
            {[["Total", counts.total], ...submissionStatuses.map((status) => [prettyStatus(status), counts[status]])].map(([label, value]) => (
              <div className="account-summary-card" key={label}>
                <span>{label}</span>
                <strong>{Number(value || 0)}</strong>
              </div>
            ))}
          </div>

          <div className="submission-list" id="accountSubmissionsList" aria-live="polite">
            {submissions.length ? submissions.slice(0, 5).map((item) => <SubmissionItem item={item} key={item.id} />) : <p className="muted">No gallery submissions yet.</p>}
          </div>
          <p className="auth-error" id="accountSubmissionsError" role="alert" hidden={!submissionsError}>{submissionsError}</p>
        </section>
      </section>

      <aside className="col-4">
        <section className="glass-card glass-card--soft glass-pad auth-panel profile-completion-panel" aria-labelledby="profileCompletionTitle">
          <p className="kicker">Profile Setup</p>
          <h2 className="section-title section-title--sm" id="profileCompletionTitle">Completeness</h2>
          <div className="profile-progress" aria-hidden="true">
            <span style={{ width: `${completion.percent}%` }} />
          </div>
          <p className="auth-status muted">
            {completion.complete} / {completion.total} core fields complete. Optional fields complete: {completion.optionalComplete} / {optionalProfileFields.length}.
          </p>
          <ul className="list-stack account-missing-list">
            {completion.missing.length ? completion.missing.map((label) => <li key={label}>{label} recommended.</li>) : <li>Core profile fields are complete.</li>}
          </ul>
        </section>

        <form className="glass-card glass-card--soft glass-pad auth-form" id="profileForm" onSubmit={saveProfile}>
          <p className="kicker">Profile</p>
          <h2 className="section-title section-title--sm">Editable Fields</h2>

          {coreProfileFields.map(([field, label]) => (
            <label className="form-field" key={field}>
              <span>{label}</span>
              <input
                id={field}
                name={field}
                maxLength={field === "display_name" || field === "game_uid" ? 40 : 80}
                minLength={field === "display_name" ? 2 : undefined}
                required={field === "display_name"}
                autoComplete={field === "display_name" ? "nickname" : "off"}
                value={formState[field]}
                onChange={(event) => setFormState((current) => ({ ...current, [field]: event.target.value }))}
                disabled={busy}
              />
            </label>
          ))}

          <label className="form-field">
            <span>Avatar URL</span>
            <input
              id="avatar_url"
              name="avatar_url"
              maxLength={500}
              inputMode="url"
              autoComplete="url"
              value={formState.avatar_url}
              onChange={(event) => setFormState((current) => ({ ...current, avatar_url: event.target.value }))}
              disabled={busy}
            />
          </label>

          <label className="form-field">
            <span>Bio</span>
            <textarea
              id="bio"
              name="bio"
              maxLength={500}
              rows={5}
              value={formState.bio}
              onChange={(event) => setFormState((current) => ({ ...current, bio: event.target.value }))}
              disabled={busy}
            />
          </label>

          <div className="auth-actions">
            <button className="hero-cta hero-cta--primary" type="submit" disabled={busy}>Save profile</button>
          </div>

          <p className="auth-status muted" id="profileStatus" role="status" aria-live="polite">{profileStatus}</p>
          <p className="auth-error" id="profileError" role="alert" hidden={!profileError}>{profileError}</p>
        </form>
      </aside>

      <div className="col-divider" aria-hidden="true" />
    </div>
  );
}
