"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { requireAuth, onAuthStateChange } from "@/lib/supabase/auth";
import {
  checkLeaderGalleryModerationAccess,
  listGalleryReviewQueue,
  listInstagramPublishQueue,
  moderateGallerySubmission,
  publishInstagramGallerySubmission,
} from "@/lib/supabase/moderation";
import {
  text,
  type GalleryReviewQueue,
  type GalleryReviewSubmission,
  type InstagramPublishJob,
  type InstagramPublishQueue,
  type ModerationStatus,
} from "@/lib/supabase/types";
import { formatBytes, formatDate } from "./format";

const statuses: Array<{ id: ModerationStatus; label: string; empty: string }> = [
  { id: "pending", label: "Pending", empty: "No pending gallery submissions." },
  { id: "approved", label: "Approved", empty: "No approved gallery submissions." },
  { id: "rejected", label: "Rejected", empty: "No rejected gallery submissions." },
  { id: "archived", label: "Archived", empty: "No archived gallery submissions." },
];

const instagramStatuses: Array<{ id: string; label: string; empty: string }> = [
  { id: "queued", label: "Queued", empty: "No Instagram-ready images." },
  { id: "ineligible", label: "Ineligible", empty: "No ineligible Instagram jobs." },
  { id: "failed", label: "Failed", empty: "No failed Instagram jobs." },
  { id: "published", label: "Published", empty: "No published Instagram posts." },
  { id: "all", label: "All", empty: "No Instagram publishing jobs." },
];

function normalizeStatus(value: unknown): ModerationStatus {
  const status = text(value, "pending").toLowerCase();
  return statuses.some((entry) => entry.id === status) ? (status as ModerationStatus) : "pending";
}

function statusConfig(status: ModerationStatus) {
  return statuses.find((entry) => entry.id === status) || statuses[0];
}

function instagramStatusConfig(status: string) {
  return instagramStatuses.find((entry) => entry.id === status) || instagramStatuses[0];
}

function uploaderName(item: GalleryReviewSubmission) {
  const uploader = item.uploader || {};
  return uploader.discordGlobalName || uploader.displayName || uploader.discordUsername || "Mochirii Member";
}

function discordDetail(item: GalleryReviewSubmission) {
  const uploader = item.uploader || {};
  if (uploader.discordGlobalName && uploader.discordUsername) return `${uploader.discordGlobalName} · ${uploader.discordUsername}`;
  return uploader.discordUsername || uploader.discordUserId || "Discord identity on file";
}

function instagramConsentLabel(item: GalleryReviewSubmission) {
  return item.instagramOptIn ? "Instagram opt-in" : "Site Gallery only";
}

function moderatorName(event: NonNullable<GalleryReviewSubmission["moderationEvents"]>[number]) {
  const moderator = event.moderator || {};
  return moderator.discordGlobalName || moderator.displayName || moderator.discordUsername || "Moderator";
}

function QueueSummary({ queue, shown }: { queue: GalleryReviewQueue | null; shown: number }) {
  const summary = queue?.summary || {};
  const cards = [
    ["Pending", summary.pending],
    ["Approved", summary.approved],
    ["Rejected", summary.rejected],
    ["Archived", summary.archived],
    ["Shown", shown],
  ];

  return (
    <div className="moderation-summary" id="queueSummary" aria-label="Gallery moderation summary">
      {cards.map(([label, value]) => (
        <div className="moderation-summary__card" key={label}>
          <span>{label}</span>
          <strong>{Number(value || 0)}</strong>
        </div>
      ))}
    </div>
  );
}

function SubmissionCard({
  item,
  activeStatus,
  busy,
  reason,
  onReasonChange,
  onModerate,
}: {
  item: GalleryReviewSubmission;
  activeStatus: ModerationStatus;
  busy: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onModerate: (item: GalleryReviewSubmission, action: "approved" | "rejected") => void;
}) {
  const status = normalizeStatus(item.status || activeStatus);
  const title = text(item.title || item.originalFilename, "Untitled image");
  const events = Array.isArray(item.moderationEvents) ? item.moderationEvents : [];
  const sourceLabel = text(item.source, "website").toLowerCase() === "discord" ? "Discord" : "Website";

  return (
    <article className={`review-item review-item--${status}`} data-submission-id={item.id || ""}>
      <div className="review-preview">
        {item.signedPreviewUrl ? (
          <img src={item.signedPreviewUrl} alt={`${title} preview`} loading="lazy" decoding="async" />
        ) : (
          <div className="review-preview__empty">
            <span>Preview unavailable</span>
          </div>
        )}
      </div>
      <div className="review-details">
        <div className="review-details__head">
          <div>
            <h3>{title}</h3>
            <p className="muted">{uploaderName(item)} · {discordDetail(item)}</p>
          </div>
          <span className={`submission-status submission-status--${status}`}>{status}</span>
        </div>
        {item.caption ? <p>{item.caption}</p> : null}
        {status === "rejected" && item.rejectionReason ? <p className="review-decision">Reason: {item.rejectionReason}</p> : null}
        <dl className="review-meta">
          {[
            ["Status", item.status || activeStatus],
            ["Source", sourceLabel],
            ["Category", item.category || "Uncategorized"],
            ["Type", item.mimeType || "Unknown"],
            ["Size", formatBytes(item.sizeBytes)],
            ["Submitted", formatDate(item.createdAt, "Not set")],
            ["Reviewed", item.reviewedAt ? formatDate(item.reviewedAt, "Not reviewed") : "Not reviewed"],
            ["Instagram", instagramConsentLabel(item)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <details className="review-storage">
          <summary>Storage reference</summary>
          <code>{item.storagePath || "Not available"}</code>
          {item.discord?.messageId ? <code>Discord message: {item.discord.messageId}</code> : null}
        </details>
        <section className="review-history" aria-label="Moderation history">
          <h4>Moderation History</h4>
          {events.length ? (
            <ol>
              {events.map((event) => (
                <li key={event.id || `${event.action}-${event.createdAt}`}>
                  <div>
                    <strong>{event.action || "reviewed"}</strong>
                    <span>{formatDate(event.createdAt, "Not set")}</span>
                  </div>
                  <p className="muted">{moderatorName(event)}{event.reason ? ` · ${event.reason}` : ""}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">No moderation history recorded yet.</p>
          )}
        </section>
        {status === "pending" ? (
          <>
            <label className="form-field review-reason">
              <span>Decline reason</span>
              <textarea
                data-reason
                maxLength={500}
                rows={3}
                placeholder="Required when declining."
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                disabled={busy}
              />
            </label>
            <div className="auth-actions">
              <button className="hero-cta hero-cta--primary" type="button" onClick={() => onModerate(item, "approved")} disabled={busy}>Approve</button>
              <button className="hero-cta" type="button" onClick={() => onModerate(item, "rejected")} disabled={busy}>Decline</button>
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}

function InstagramJobCard({
  job,
  busy,
  caption,
  altText,
  onCaptionChange,
  onAltTextChange,
  onPublish,
}: {
  job: InstagramPublishJob;
  busy: boolean;
  caption: string;
  altText: string;
  onCaptionChange: (value: string) => void;
  onAltTextChange: (value: string) => void;
  onPublish: (job: InstagramPublishJob) => void;
}) {
  const submission = job.submission || {};
  const title = text(submission.title || submission.originalFilename, "Untitled image");
  const sourceLabel = text(submission.source, "website").toLowerCase() === "discord" ? "Discord" : "Website";
  const status = text(job.status, "queued").toLowerCase();
  const canPublish = status === "queued" || status === "failed";
  const permalink = text(job.instagramPermalink);

  return (
    <article className={`review-item review-item--${status}`} data-instagram-job-id={job.id || ""}>
      <div className="review-preview">
        {job.signedPreviewUrl ? (
          <img src={job.signedPreviewUrl} alt={`${title} Instagram preview`} loading="lazy" decoding="async" />
        ) : (
          <div className="review-preview__empty">
            <span>Preview unavailable</span>
          </div>
        )}
      </div>
      <div className="review-details">
        <div className="review-details__head">
          <div>
            <h3>{title}</h3>
            <p className="muted">{submission.uploader?.displayName || "Mochirii Member"} - {sourceLabel}</p>
          </div>
          <span className={`submission-status submission-status--${status}`}>{status}</span>
        </div>
        {job.eligibilityReason ? <p className="review-decision">Eligibility: {job.eligibilityReason}</p> : null}
        {job.lastError ? <p className="review-decision">Last error: {job.lastError}</p> : null}
        {permalink ? (
          <p>
            <a href={permalink} target="_blank" rel="noopener noreferrer">Open Instagram post</a>
          </p>
        ) : null}
        <dl className="review-meta">
          {[
            ["Consent", submission.instagramOptIn ? "Instagram opt-in" : "No opt-in"],
            ["Type", submission.mimeType || "Unknown"],
            ["Size", formatBytes(submission.sizeBytes)],
            ["Attempts", String(job.attemptCount || 0)],
            ["Queued", formatDate(job.createdAt, "Not set")],
            ["Published", job.publishedAt ? formatDate(job.publishedAt, "Not published") : "Not published"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <label className="form-field">
          <span>Instagram caption</span>
          <textarea
            maxLength={2200}
            rows={4}
            value={caption}
            disabled={busy || !canPublish}
            onChange={(event) => onCaptionChange(event.target.value.slice(0, 2200))}
          />
        </label>
        <label className="form-field">
          <span>Instagram alt text</span>
          <textarea
            maxLength={1000}
            rows={3}
            value={altText}
            disabled={busy || !canPublish}
            onChange={(event) => onAltTextChange(event.target.value.slice(0, 1000))}
          />
        </label>
        <div className="auth-actions">
          <button
            className="hero-cta hero-cta--primary"
            type="button"
            disabled={busy || !canPublish}
            onClick={() => onPublish(job)}
          >
            Publish to Instagram
          </button>
        </div>
      </div>
    </article>
  );
}

export function LeaderDashboard() {
  const [busy, setBusy] = useState(true);
  const [panel, setPanel] = useState<"signed-out" | "denied" | "review">("signed-out");
  const [activeStatus, setActiveStatus] = useState<ModerationStatus>("pending");
  const [queue, setQueue] = useState<GalleryReviewQueue | null>(null);
  const [reviewStatus, setReviewStatus] = useState("Loading pending submissions.");
  const [reviewError, setReviewError] = useState("");
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("Gallery moderation requires Discord membership, completed onboarding, and the Moderator role.");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [instagramActiveStatus, setInstagramActiveStatus] = useState("queued");
  const [instagramQueue, setInstagramQueue] = useState<InstagramPublishQueue | null>(null);
  const [instagramBusy, setInstagramBusy] = useState(false);
  const [instagramStatus, setInstagramStatus] = useState("Instagram queue has not loaded yet.");
  const [instagramError, setInstagramError] = useState("");
  const [instagramCaptions, setInstagramCaptions] = useState<Record<string, string>>({});
  const [instagramAltTexts, setInstagramAltTexts] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async ({ status = activeStatus, successMessage = "" }: { status?: ModerationStatus; successMessage?: string } = {}) => {
    const nextStatus = normalizeStatus(status);
    const config = statusConfig(nextStatus);
    setActiveStatus(nextStatus);
    setBusy(true);
    setReviewError("");
    setReviewStatus(`Loading ${config.label.toLowerCase()} submissions.`);

    const result = await listGalleryReviewQueue({ status: nextStatus });
    if (!result.ok) {
      setQueue(null);
      setReviewError(result.message || "Gallery moderation submissions could not be loaded.");
      setReviewStatus("");
      setBusy(false);
      return;
    }

    const data = result.data || { submissions: [] };
    setQueue(data);
    setReviewStatus(
      successMessage ||
        (data.submissions?.length
          ? `${data.submissions.length} ${config.label.toLowerCase()} submission${data.submissions.length === 1 ? "" : "s"} shown.`
          : config.empty),
    );
    setBusy(false);
  }, [activeStatus]);

  const loadInstagramQueue = useCallback(async ({ status = instagramActiveStatus, successMessage = "" }: { status?: string; successMessage?: string } = {}) => {
    const nextStatus = instagramStatusConfig(status).id;
    const config = instagramStatusConfig(nextStatus);
    setInstagramActiveStatus(nextStatus);
    setInstagramBusy(true);
    setInstagramError("");
    setInstagramStatus(`Loading ${config.label.toLowerCase()} Instagram jobs.`);

    const result = await listInstagramPublishQueue({ status: nextStatus });
    if (!result.ok) {
      setInstagramQueue(null);
      setInstagramError(result.message || "Instagram publishing queue could not be loaded.");
      setInstagramStatus("");
      setInstagramBusy(false);
      return;
    }

    const data = result.data || { jobs: [] };
    setInstagramQueue(data);
    setInstagramStatus(
      successMessage ||
        (data.jobs?.length
          ? `${data.jobs.length} ${config.label.toLowerCase()} Instagram job${data.jobs.length === 1 ? "" : "s"} shown.`
          : config.empty),
    );
    setInstagramBusy(false);
  }, [instagramActiveStatus]);

  const checkAccess = useCallback(async () => {
    setBusy(true);
    setReviewError("");
    setReviewStatus("Checking moderator access.");
    const auth = await requireAuth();
    if (!auth.ok) {
      setPanel("signed-out");
      setBusy(false);
      return;
    }

    const access = await checkLeaderGalleryModerationAccess();
    if (!access.ok) {
      setAccessDeniedMessage(access.message || "Gallery moderation requires Discord membership, completed onboarding, and the Moderator role.");
      setPanel("denied");
      setBusy(false);
      return;
    }

    setPanel("review");
    await loadQueue({ status: activeStatus });
    await loadInstagramQueue({ status: instagramActiveStatus });
  }, [activeStatus, instagramActiveStatus, loadInstagramQueue, loadQueue]);

  useEffect(() => {
    void Promise.resolve().then(() => checkAccess());
    const subscription = onAuthStateChange(() => {
      void checkAccess();
    });
    return () => {
      subscription.data?.subscription?.unsubscribe();
    };
  }, [checkAccess]);

  async function moderate(item: GalleryReviewSubmission, action: "approved" | "rejected") {
    const submissionId = text(item.id);
    const reason = text(reasons[submissionId]);

    if (action === "rejected" && reason.length < 2) {
      setReviewError("Add a decline reason before rejecting this submission.");
      return;
    }

    setBusy(true);
    setReviewError("");
    setReviewStatus(action === "approved" ? "Approving submission." : "Declining submission.");
    const result = await moderateGallerySubmission(submissionId, action, reason);
    if (!result.ok) {
      setReviewError(result.message || "The submission could not be moderated.");
      setReviewStatus("");
      setBusy(false);
      return;
    }

    await loadQueue({
      status: activeStatus,
      successMessage: result.message || "Submission moderated.",
    });
    if (action === "approved") {
      await loadInstagramQueue({ status: instagramActiveStatus });
    }
  }

  async function publishInstagram(job: InstagramPublishJob) {
    const jobId = text(job.id);
    const caption = instagramCaptions[jobId] ?? text(job.caption, "Shared from the Mōchirīī guild gallery.");
    const altText = instagramAltTexts[jobId] ?? text(job.altText);
    const confirmed =
      typeof window !== "undefined" &&
      window.confirm("Publish this approved member image to the official Mōchirīī Instagram account?");

    if (!confirmed) return;

    setInstagramBusy(true);
    setInstagramError("");
    setInstagramStatus("Publishing image to Instagram.");

    const result = await publishInstagramGallerySubmission({
      jobId,
      caption,
      altText,
      confirmPublish: true,
    });

    if (!result.ok) {
      setInstagramError(result.message || "Instagram publishing failed.");
      setInstagramStatus("");
      setInstagramBusy(false);
      await loadInstagramQueue({ status: instagramActiveStatus });
      return;
    }

    await loadInstagramQueue({
      status: instagramActiveStatus,
      successMessage: result.message || "Image published to Instagram.",
    });
  }

  if (panel === "signed-out") {
    return (
      <section className="glass-card glass-card--primary glass-pad auth-panel" id="signedOutPanel">
        <p className="kicker">Sign In Required</p>
        <h2 className="section-title">Login with Discord</h2>
        <p className="muted">Moderator access is checked against Discord after website sign-in.</p>
        <div className="auth-actions">
          <Link className="hero-cta hero-cta--primary" href="/auth">Login</Link>
          <Link className="hero-cta" href="/account">Account</Link>
        </div>
      </section>
    );
  }

  if (panel === "denied") {
    return (
      <section className="glass-card glass-card--primary glass-pad auth-panel" id="accessDeniedPanel">
        <p className="kicker">Access Denied</p>
        <h2 className="section-title">Moderator Role Required</h2>
        <p className="muted" id="accessDeniedMessage">{accessDeniedMessage}</p>
        <div className="auth-actions">
          <Link className="hero-cta hero-cta--primary" href="/account">Open Account</Link>
        </div>
      </section>
    );
  }

  const submissions = Array.isArray(queue?.submissions) ? queue.submissions : [];
  const config = statusConfig(activeStatus);
  const instagramJobs = Array.isArray(instagramQueue?.jobs) ? instagramQueue.jobs : [];
  const instagramConfig = instagramStatusConfig(instagramActiveStatus);

  return (
    <>
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="reviewPanel">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Moderation Queue</p>
          <h2 className="section-title">Member Submissions</h2>
        </div>
        <button className="hero-cta" type="button" onClick={() => loadQueue({ status: activeStatus })} disabled={busy}>Refresh</button>
      </div>

      <div className="queue-tabs" id="queueTabs" role="group" aria-label="Gallery moderation queues">
        {statuses.map((status) => (
          <button
            className="queue-tab"
            type="button"
            data-status={status.id}
            aria-pressed={status.id === activeStatus}
            disabled={busy}
            key={status.id}
            onClick={() => loadQueue({ status: status.id })}
          >
            {status.label} · {Number(queue?.summary?.[status.id] || 0)}
          </button>
        ))}
      </div>

      <QueueSummary queue={queue} shown={submissions.length} />

      <p className="auth-status muted" id="reviewStatus" role="status" aria-live="polite">{reviewStatus}</p>
      <p className="auth-error" id="reviewError" role="alert" hidden={!reviewError}>{reviewError}</p>

      <div className="review-list" id="reviewList" aria-live="polite">
        {submissions.length ? (
          submissions.map((item) => {
            const id = text(item.id, "unknown");
            return (
              <SubmissionCard
                item={item}
                activeStatus={activeStatus}
                busy={busy}
                reason={reasons[id] || ""}
                key={id}
                onReasonChange={(value) => setReasons((current) => ({ ...current, [id]: value.slice(0, 500) }))}
                onModerate={moderate}
              />
            );
          })
        ) : (
          <p className="muted">{config.empty}</p>
        )}
      </div>
    </section>
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="instagramQueuePanel">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Instagram Queue</p>
          <h2 className="section-title">Approved Social Publishing</h2>
        </div>
        <button className="hero-cta" type="button" onClick={() => loadInstagramQueue({ status: instagramActiveStatus })} disabled={instagramBusy}>Refresh</button>
      </div>

      <div className="queue-tabs" role="group" aria-label="Instagram publishing queues">
        {instagramStatuses.map((status) => (
          <button
            className="queue-tab"
            type="button"
            data-status={status.id}
            aria-pressed={status.id === instagramActiveStatus}
            disabled={instagramBusy}
            key={status.id}
            onClick={() => loadInstagramQueue({ status: status.id })}
          >
            {status.label} - {Number(instagramQueue?.summary?.[status.id === "all" ? "total" : status.id] || 0)}
          </button>
        ))}
      </div>

      <p className="auth-status muted" role="status" aria-live="polite">{instagramStatus}</p>
      <p className="auth-error" role="alert" hidden={!instagramError}>{instagramError}</p>

      <div className="review-list" aria-live="polite">
        {instagramJobs.length ? (
          instagramJobs.map((job) => {
            const id = text(job.id, "unknown");
            return (
              <InstagramJobCard
                job={job}
                busy={instagramBusy}
                caption={instagramCaptions[id] ?? text(job.caption, "Shared from the Mōchirīī guild gallery.")}
                altText={instagramAltTexts[id] ?? text(job.altText)}
                key={id}
                onCaptionChange={(value) => setInstagramCaptions((current) => ({ ...current, [id]: value }))}
                onAltTextChange={(value) => setInstagramAltTexts((current) => ({ ...current, [id]: value }))}
                onPublish={publishInstagram}
              />
            );
          })
        ) : (
          <p className="muted">{instagramConfig.empty}</p>
        )}
      </div>
    </section>
    </>
  );
}
