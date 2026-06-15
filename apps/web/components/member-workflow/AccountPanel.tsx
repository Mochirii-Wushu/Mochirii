"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ProviderLogo } from "@/components/member-workflow/ProviderLogo";
import { enabledOAuthProviders, type OAuthProviderId } from "@/lib/supabase/auth-providers";
import { getLinkedIdentities, linkProviderIdentity } from "@/lib/supabase/auth";
import { getCurrentProfile, profileHasVerifiedRoles, signedInName, updateCurrentProfile, verifyMemberAccess } from "@/lib/supabase/profile";
import { listMyGallerySubmissions } from "@/lib/supabase/gallery-submissions";
import { checkLeaderGalleryModerationAccess } from "@/lib/supabase/moderation";
import { listMyProfileMedia, updateProfileVisibility, uploadProfileMedia } from "@/lib/supabase/member-profiles";
import { onAuthStateChange, requireAuth, signOut } from "@/lib/supabase/auth";
import { type EditableProfilePayload, type GallerySubmission, type MemberAccessIdentity, type MemberAccessResponse, type MemberProfile, type MemberProfileMedia, type ProfileMediaKind, text } from "@/lib/supabase/types";
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

function profileMediaLabel(kind: unknown) {
  return text(kind, "profile image").toLowerCase() === "banner" ? "Banner" : "Avatar";
}

function ProfileMediaStatus({ item }: { item: MemberProfileMedia }) {
  const status = text(item.status, "pending").toLowerCase();
  return (
    <article className="profile-media-item">
      <div>
        <strong>{profileMediaLabel(item.media_kind)}</strong>
        <span>{text(item.original_filename, "Uploaded image")}</span>
      </div>
      <span className={`submission-status submission-status--${status}`}>{status}</span>
      <small>{status === "rejected" && item.rejection_reason ? item.rejection_reason : formatDateShort(item.created_at)}</small>
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
  const [memberAccess, setMemberAccess] = useState<MemberAccessResponse | null>(null);
  const [linkedIdentities, setLinkedIdentities] = useState<MemberAccessIdentity[]>([]);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [submissions, setSubmissions] = useState<GallerySubmission[]>([]);
  const [profileMedia, setProfileMedia] = useState<MemberProfileMedia[]>([]);
  const [moderatorAvailable, setModeratorAvailable] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [submissionsError, setSubmissionsError] = useState("");
  const [profileMediaError, setProfileMediaError] = useState("");

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

  const loadProfileMedia = useCallback(async () => {
    setProfileMediaError("");
    const result = await listMyProfileMedia();
    if (!result.ok) {
      setProfileMedia([]);
      setProfileMediaError(result.message || "Profile images could not be loaded.");
      return;
    }
    setProfileMedia(Array.isArray(result.data) ? result.data : []);
  }, []);

  const refreshMemberAccess = useCallback(async (options: { refreshDiscord?: boolean } = {}) => {
    const result = await verifyMemberAccess({ refreshDiscord: options.refreshDiscord === true });
    if (result.ok) {
      const nextAccess = result.data || null;
      setMemberAccess(nextAccess);
      setLinkedIdentities(Array.isArray(nextAccess?.identities) ? nextAccess.identities : []);
      if (nextAccess?.profile) setProfile(nextAccess.profile);
      return result;
    }

    const identities = await getLinkedIdentities();
    if (identities.ok && Array.isArray(identities.data)) {
      setLinkedIdentities(
        identities.data
          .map((identity) => {
            const record = identity && typeof identity === "object" ? identity as Record<string, unknown> : {};
            return {
              provider: text(record.provider),
              providerSubject: text(record.provider_id || record.id),
              displayLabel: text(record.provider || record.provider_id || record.id),
            };
          })
          .filter((identity) => identity.provider),
      );
    }

    return result;
  }, []);

  const loadAccount = useCallback(async () => {
    setBusy(true);
    setVerifyError("");
    setProfileError("");
    setSubmissionsError("");
    setProfileMediaError("");
    setProfileStatus("");

    const auth = await requireAuth();
    if (!auth.ok || !auth.data?.user) {
      setUser(null);
      setProfile(null);
      setMemberAccess(null);
      setLinkedIdentities([]);
      setSubmissions([]);
      setProfileMedia([]);
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
    const accessResult = await refreshMemberAccess();
    if (!accessResult.ok) setVerifyError(accessResult.message || "Member verification state could not be loaded.");
    await loadSubmissions();
    await loadProfileMedia();

    const moderation = await checkLeaderGalleryModerationAccess();
    setModeratorAvailable(moderation.ok === true);
    setBusy(false);
  }, [loadProfileMedia, loadSubmissions, refreshMemberAccess]);

  useEffect(() => {
    void Promise.resolve().then(() => loadAccount());
    const subscription = onAuthStateChange(() => {
      void loadAccount();
    });
    return () => {
      subscription.data?.subscription?.unsubscribe();
    };
  }, [loadAccount]);

  async function checkMemberAccess() {
    setBusy(true);
    setVerifyError("");
    setVerifyStatus("Checking member verification and linked sign-in methods.");
    const result = await refreshMemberAccess({ refreshDiscord: true });
    const message = result.ok
      ? result.data?.message || result.message || "Member verification checked."
      : result.message || "Member verification failed.";
    await loadAccount();

    if (!result.ok) {
      setVerifyError(message);
      setVerifyStatus("");
    } else {
      setVerifyStatus(message);
    }
    setBusy(false);
  }

  async function linkProvider(providerId: OAuthProviderId) {
    setBusy(true);
    setVerifyError("");
    setVerifyStatus(`Opening ${providerId} account link.`);
    const result = await linkProviderIdentity(providerId, { redirectTo: "/account" });
    if (!result.ok) {
      setVerifyError(result.message || "Provider link could not start.");
      setVerifyStatus("");
      setBusy(false);
    }
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

  async function toggleProfileVisibility() {
    setBusy(true);
    setProfileError("");
    setProfileStatus(profile?.profile_public_enabled ? "Hiding member profile." : "Publishing member profile.");
    const result = await updateProfileVisibility(profile?.profile_public_enabled !== true);
    if (!result.ok) {
      setProfileError(result.message || "Profile visibility could not be updated.");
      setProfileStatus("");
    } else {
      setProfile(result.data || null);
      setFormState(formStateFromProfile(result.data || null));
      setProfileStatus(result.message || "Profile visibility updated.");
    }
    setBusy(false);
  }

  async function submitProfileMedia(kind: ProfileMediaKind, file: File | null) {
    setBusy(true);
    setProfileMediaError("");
    setProfileStatus(`Uploading ${kind} image for review.`);
    const result = file ? await uploadProfileMedia(kind, file) : { ok: false, message: "Choose an image file." };
    if (!result.ok) {
      setProfileMediaError(result.message || "Profile image could not be uploaded.");
      setProfileStatus("");
    } else {
      setProfileStatus(`${profileMediaLabel(kind)} image sent for moderator review.`);
      await loadProfileMedia();
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
        <h2 className="section-title">Choose a Sign-In Method</h2>
        <p className="muted">A website account is required before member verification and gallery access can be checked.</p>
        <div className="auth-actions">
          <Link className="hero-cta hero-cta--primary" href="/auth">Login</Link>
        </div>
      </section>
    );
  }

  const access = uploadAccess(profile, memberAccess);
  const completion = profileCompletion(profile);
  const hasRoles = profile?.has_required_discord_roles === true;
  const recentRoles = profileHasVerifiedRoles(profile);
  const enabledProviders = enabledOAuthProviders();
  const linkedProviderIds = new Set(linkedIdentities.map((identity) => text(identity.provider).toLowerCase()).filter(Boolean));
  const availableLinkProviders = enabledProviders.filter((provider) => !linkedProviderIds.has(provider.id));
  const counts = countSubmissions(submissions);
  const profileIsPublished = profile?.profile_public_enabled === true;
  const profileSlug = text(profile?.profile_slug);
  const latestMedia = (kind: ProfileMediaKind) => profileMedia.find((item) => text(item.media_kind).toLowerCase() === kind);
  const discordHandle = text(profile?.discord_handle || profile?.discord_username || profile?.discord_global_name, signedInName(user, profile));
  const bioLength = formState.bio.length;

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
              <dt>Discord handle</dt>
              <dd>{discordHandle}</dd>
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
              <dt>Access method</dt>
              <dd>{memberAccess?.method ? prettyStatus(memberAccess.method) : "Not approved"}</dd>
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
              <h2 className="section-title">Member Verification</h2>
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
              <dt>Review status</dt>
              <dd>{prettyStatus(memberAccess?.verification?.status || "pending_review")}</dd>
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
            <button className="account-action-card account-action-card--button" type="button" onClick={checkMemberAccess} disabled={busy}>
              <span>Check Verification</span>
              <small>Refresh linked identities, review state, and Discord role status.</small>
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
              <li>Or have moderator-approved member verification.</li>
            </ul>
          </div>

          <p className="auth-status muted" id="verifyStatus" role="status" aria-live="polite">{verifyStatus}</p>
          <p className="auth-error" id="verifyError" role="alert" hidden={!verifyError}>{verifyError}</p>
        </div>

        <section className="glass-card glass-card--primary glass-pad auth-panel" aria-labelledby="linkedMethodsTitle">
          <div className="auth-panel__head">
            <div>
              <p className="kicker">Identity Linking</p>
              <h2 className="section-title" id="linkedMethodsTitle">Sign-In Methods</h2>
            </div>
            <StatusPill tone={linkedIdentities.length ? "active" : "muted"}>{linkedIdentities.length ? `${linkedIdentities.length} linked` : "None synced"}</StatusPill>
          </div>

          <div className="identity-list" aria-live="polite">
            {linkedIdentities.length ? linkedIdentities.map((identity) => (
              <article className="identity-item" key={`${identity.provider}-${identity.providerSubject}`}>
                <div>
                  <strong>{prettyStatus(identity.provider)}</strong>
                  <span>{text(identity.displayLabel || identity.providerSubject, "Identity on file")}</span>
                </div>
                <small>{identity.emailVerified || identity.phoneVerified ? "Verified by provider" : "Provider identity evidence"}</small>
              </article>
            )) : <p className="muted">Linked methods appear after the next member verification check.</p>}
          </div>

          {availableLinkProviders.length ? (
            <div className="provider-grid provider-grid--compact" aria-label="Link another sign-in method">
              {availableLinkProviders.map((provider) => (
                <button className="provider-button" type="button" onClick={() => linkProvider(provider.id)} disabled={busy} key={provider.id}>
                  <ProviderLogo provider={provider.id} />
                  <span className="provider-button__copy">
                    <span>Link {provider.shortLabel}</span>
                    <small>{provider.automaticVerification ? "Automatic Discord role check" : "Review required"}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

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
          <progress className="profile-progress" value={completion.percent} max={100} aria-hidden="true">
            {completion.percent}%
          </progress>
          <p className="auth-status muted">
            {completion.complete} / {completion.total} core fields complete. Optional fields complete: {completion.optionalComplete} / {optionalProfileFields.length}.
          </p>
          <ul className="list-stack account-missing-list">
            {completion.missing.length ? completion.missing.map((label) => <li key={label}>{label} recommended.</li>) : <li>Core profile fields are complete.</li>}
          </ul>
        </section>

        <section className="glass-card glass-card--soft glass-pad auth-panel profile-publish-panel" aria-labelledby="profilePublishTitle">
          <div className="auth-panel__head">
            <div>
              <p className="kicker">Member Profile</p>
              <h2 className="section-title section-title--sm" id="profilePublishTitle">Published Page</h2>
            </div>
            <StatusPill tone={profileIsPublished ? "active" : "muted"}>{profileIsPublished ? "Published" : "Hidden"}</StatusPill>
          </div>

          <p className="auth-status muted">
            Published profiles are visible only to active verified members. Avatar and banner images appear after moderator approval.
          </p>

          <div className="auth-actions">
            <button className="hero-cta hero-cta--primary" type="button" onClick={toggleProfileVisibility} disabled={busy || !access.ok}>
              {profileIsPublished ? "Hide profile" : "Publish profile"}
            </button>
            {profileIsPublished && profileSlug ? <Link className="hero-cta" href={`/members/${profileSlug}`}>View profile</Link> : null}
          </div>

          <div className="profile-media-upload-grid" aria-label="Profile image uploads">
            {(["avatar", "banner"] as const).map((kind) => (
              <label className="form-field profile-media-upload" key={kind}>
                <span>{profileMediaLabel(kind)} image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy || !access.ok}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    event.target.value = "";
                    void submitProfileMedia(kind, file);
                  }}
                />
              </label>
            ))}
          </div>

          <div className="profile-media-list" aria-live="polite">
            {(["avatar", "banner"] as const).map((kind) => {
              const item = latestMedia(kind);
              return item ? <ProfileMediaStatus item={item} key={kind} /> : <p className="muted" key={kind}>No {kind} image submitted yet.</p>;
            })}
          </div>

          <p className="auth-error" role="alert" hidden={!profileMediaError}>{profileMediaError}</p>
        </section>

        <form className="glass-card glass-card--soft glass-pad auth-form" id="profileForm" onSubmit={saveProfile}>
          <p className="kicker">Profile</p>
          <h2 className="section-title section-title--sm">Editable Fields</h2>

          <label className="form-field">
            <span>Discord handle</span>
            <input
              id="discord_handle_readonly"
              value={discordHandle}
              readOnly
              aria-readonly="true"
              disabled={busy}
            />
            <small>Verified from Discord and not editable here.</small>
          </label>

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
            <span>Bio</span>
            <textarea
              id="bio"
              name="bio"
              maxLength={1000}
              rows={5}
              value={formState.bio}
              onChange={(event) => setFormState((current) => ({ ...current, bio: event.target.value }))}
              disabled={busy}
            />
            <small>{bioLength} / 1000 characters</small>
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
