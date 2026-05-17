"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { requireAuth, onAuthStateChange } from "@/lib/supabase/auth";
import { checkLeaderGalleryModerationAccess, listGalleryReviewQueue, moderateGallerySubmission } from "@/lib/supabase/moderation";
import { text, type GalleryReviewQueue, type GalleryReviewSubmission, type ModerationStatus } from "@/lib/supabase/types";
import { formatBytes, formatDate } from "./format";

const statuses: Array<{ id: ModerationStatus; label: string; empty: string }> = [
  { id: "pending", label: "Pending", empty: "No pending gallery submissions." },
  { id: "approved", label: "Approved", empty: "No approved gallery submissions." },
  { id: "rejected", label: "Rejected", empty: "No rejected gallery submissions." },
  { id: "archived", label: "Archived", empty: "No archived gallery submissions." },
];

function normalizeStatus(value: unknown): ModerationStatus {
  const status = text(value, "pending").toLowerCase();
  return statuses.some((entry) => entry.id === status) ? (status as ModerationStatus) : "pending";
}

function statusConfig(status: ModerationStatus) {
  return statuses.find((entry) => entry.id === status) || statuses[0];
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
            ["Category", item.category || "Uncategorized"],
            ["Type", item.mimeType || "Unknown"],
            ["Size", formatBytes(item.sizeBytes)],
            ["Submitted", formatDate(item.createdAt, "Not set")],
            ["Reviewed", item.reviewedAt ? formatDate(item.reviewedAt, "Not reviewed") : "Not reviewed"],
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

export function LeaderDashboard() {
  const [busy, setBusy] = useState(true);
  const [panel, setPanel] = useState<"signed-out" | "denied" | "review">("signed-out");
  const [activeStatus, setActiveStatus] = useState<ModerationStatus>("pending");
  const [queue, setQueue] = useState<GalleryReviewQueue | null>(null);
  const [reviewStatus, setReviewStatus] = useState("Loading pending submissions.");
  const [reviewError, setReviewError] = useState("");
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("Gallery moderation requires Discord membership, completed onboarding, and the Moderator role.");
  const [reasons, setReasons] = useState<Record<string, string>>({});

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
  }, [activeStatus, loadQueue]);

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

  return (
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
  );
}
