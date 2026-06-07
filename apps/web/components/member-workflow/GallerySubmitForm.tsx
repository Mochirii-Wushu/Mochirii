"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { requireAuth, onAuthStateChange } from "@/lib/supabase/auth";
import { getCurrentProfile, profileIsActive, verifyDiscordMembership } from "@/lib/supabase/profile";
import { listMyGallerySubmissions, uploadMemberGalleryImage } from "@/lib/supabase/gallery-submissions";
import { type GallerySubmission, type MemberProfile, text } from "@/lib/supabase/types";
import { formatDateShort, uploadAccess } from "./format";

function SubmissionStatus({ status }: { status?: string | null }) {
  const value = text(status, "pending").toLowerCase();
  return <span className={`submission-status submission-status--${value}`}>{value}</span>;
}

function SubmissionItem({ item }: { item: GallerySubmission }) {
  const instagramOptIn = item.instagram_opt_in === true;

  return (
    <article className="submission-item">
      <div className="submission-item__head">
        <h3>{text(item.title || item.original_filename, "Untitled image")}</h3>
        <SubmissionStatus status={item.status} />
      </div>
      {item.caption ? <p>{item.caption}</p> : null}
      <div className="submission-meta">
        <span>{formatDateShort(item.created_at, "Unknown date")}</span>
        {item.category ? <span>{item.category}</span> : null}
        <span>{instagramOptIn ? "Instagram opt-in" : "Site Gallery only"}</span>
      </div>
    </article>
  );
}

export function GallerySubmitForm() {
  const [busy, setBusy] = useState(true);
  const [mode, setMode] = useState<"signed-out" | "needs-verification" | "allowed">("signed-out");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [submissions, setSubmissions] = useState<GallerySubmission[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [instagramOptIn, setInstagramOptIn] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submissionsError, setSubmissionsError] = useState("");

  const loadSubmissions = useCallback(async () => {
    setSubmissionsError("");
    const result = await listMyGallerySubmissions();
    if (!result.ok) {
      setSubmissions([]);
      setSubmissionsError(result.message || "Submissions could not be loaded.");
      return;
    }
    setSubmissions(Array.isArray(result.data) ? result.data : []);
  }, []);

  const checkAccess = useCallback(async ({ refresh = false }: { refresh?: boolean } = {}) => {
    setBusy(true);
    setError("");
    setStatus("");

    const auth = await requireAuth();
    if (!auth.ok) {
      setProfile(null);
      setMode("signed-out");
      setBusy(false);
      return;
    }

    if (refresh) {
      const verify = await verifyDiscordMembership();
      if (!verify.ok) setError(verify.message || "Discord verification could not be checked.");
    }

    const profileResult = await getCurrentProfile();
    const nextProfile = profileResult.data || null;
    setProfile(nextProfile);

    if (!profileResult.ok || !profileIsActive(nextProfile)) {
      setMode("needs-verification");
      setBusy(false);
      return;
    }

    setMode("allowed");
    await loadSubmissions();
    setBusy(false);
  }, [loadSubmissions]);

  useEffect(() => {
    void Promise.resolve().then(() => checkAccess());
    const subscription = onAuthStateChange(() => {
      void checkAccess();
    });
    return () => {
      subscription.data?.subscription?.unsubscribe();
    };
  }, [checkAccess]);

  async function submitImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("Submitting image for moderation.");

    const result = await uploadMemberGalleryImage(file, { title, caption, category, instagramOptIn });
    if (!result.ok) {
      setError(result.message || "Upload failed.");
      setStatus("");
      setBusy(false);
      return;
    }

    setTitle("");
    setCaption("");
    setCategory("");
    setFile(null);
    setInstagramOptIn(false);
    await checkAccess();
    await loadSubmissions();
    setStatus("Image submitted for moderation. It will not appear in the public Gallery until Moderator approval.");
    setBusy(false);
  }

  const allowed = mode === "allowed";
  const access = uploadAccess(profile);
  const gateTitle = mode === "signed-out" ? "Login Required" : allowed ? "Upload Ready" : "Role Verification Required";
  const gateState = mode === "signed-out" ? "Signed out" : allowed ? "Ready" : "Needs roles";
  const gateMessage =
    mode === "signed-out"
      ? "Login with Discord before submitting images."
      : allowed
        ? "Upload access verified."
        : "Gallery upload access requires Discord server membership, completed onboarding, Mōchirīī - WWM, ✅Verified, active member status, and a recent verification check.";

  return (
    <>
      {!allowed ? (
        <section className="glass-card glass-card--primary glass-pad auth-panel" id="uploadGate">
          <div className="auth-panel__head">
            <div>
              <p className="kicker">Access Check</p>
              <h2 className="section-title" id="uploadGateTitle">{gateTitle}</h2>
            </div>
            <p className="status-pill" id="uploadGateState">{busy ? "Loading" : gateState}</p>
          </div>
          <p className="muted" id="uploadGateMessage">{busy ? "Checking sign-in and Discord verification." : gateMessage}</p>
          <div className="auth-actions" id="uploadGateActions">
            {mode === "signed-out" ? <Link className="hero-cta hero-cta--primary" href="/auth">Login</Link> : null}
            {mode === "needs-verification" ? (
              <>
                <button className="hero-cta hero-cta--primary" type="button" onClick={() => checkAccess({ refresh: true })} disabled={busy}>
                  Check Discord verification
                </button>
                <Link className="hero-cta" href="/account">Open Account</Link>
              </>
            ) : null}
          </div>
          <div className="requirement-list">
            <h3 className="section-title section-title--sm">Required before upload</h3>
            <ul className="list-stack">
              <li>Discord server membership.</li>
              <li>Completed Discord verification.</li>
              <li>Mōchirīī - WWM.</li>
              <li>✅Verified.</li>
              <li>Active website member status.</li>
            </ul>
          </div>
          <p className="auth-error" role="alert" hidden={!error}>{error}</p>
        </section>
      ) : null}

      {allowed ? (
        <div className="grid-12 grid-gap" id="uploadPanel">
          <section className="col-8">
            <form className="glass-card glass-card--primary glass-pad auth-form upload-form" id="uploadForm" onSubmit={submitImage}>
              <p className="kicker">Pending Moderation</p>
              <h2 className="section-title">Upload Image</h2>
              <p className="muted">Accepted file types are JPEG, PNG & WebP. The browser limit is 50 MB.</p>
              <p className="auth-status muted" role="status" aria-live="polite">{access.guidance}</p>

              <label className="form-field">
                <span>Image file</span>
                <input
                  id="imageFile"
                  name="imageFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  disabled={busy}
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </label>

              <label className="form-field">
                <span>Title</span>
                <input id="title" name="title" maxLength={80} autoComplete="off" value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} />
              </label>

              <label className="form-field">
                <span>Caption</span>
                <textarea id="caption" name="caption" maxLength={300} rows={4} value={caption} disabled={busy} onChange={(event) => setCaption(event.target.value)} />
              </label>

              <label className="form-field">
                <span>Category</span>
                <select id="category" name="category" value={category} disabled={busy} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">Choose if useful</option>
                  <option value="portraits">Portraits</option>
                  <option value="gatherings">Gatherings</option>
                  <option value="action">Action</option>
                  <option value="scenery">Scenery</option>
                  <option value="companions">Companions</option>
                </select>
              </label>

              <label className="form-check">
                <input
                  id="instagramOptIn"
                  name="instagramOptIn"
                  type="checkbox"
                  checked={instagramOptIn}
                  disabled={busy}
                  onChange={(event) => setInstagramOptIn(event.target.checked)}
                />
                <span>Allow Mōchirīī to share this image on our official Instagram if approved.</span>
              </label>

              <div className="auth-actions">
                <button className="hero-cta hero-cta--primary" type="submit" disabled={busy}>Submit for Review</button>
              </div>

              <p className="auth-status muted" id="uploadStatus" role="status" aria-live="polite">{status}</p>
              <p className="auth-error" id="uploadError" role="alert" hidden={!error}>{error}</p>
            </form>
          </section>

          <aside className="col-4">
            <section className="glass-card glass-card--soft glass-pad auth-panel" aria-labelledby="mySubmissionsTitle">
              <div className="auth-panel__head">
                <div>
                  <p className="kicker">My Gallery</p>
                  <h2 className="section-title section-title--sm" id="mySubmissionsTitle">My Submissions</h2>
                </div>
              </div>
              <div className="submission-list" id="submissionsList" aria-live="polite">
                {submissions.length ? submissions.map((item) => <SubmissionItem item={item} key={item.id} />) : <p className="muted">No submissions yet.</p>}
              </div>
              <p className="auth-error" id="submissionsError" role="alert" hidden={!submissionsError}>{submissionsError}</p>
            </section>
          </aside>
          <div className="col-divider" aria-hidden="true" />
        </div>
      ) : null}
    </>
  );
}
