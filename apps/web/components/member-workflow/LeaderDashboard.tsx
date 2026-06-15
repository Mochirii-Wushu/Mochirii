"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { requireAuth, onAuthStateChange } from "@/lib/supabase/auth";
import {
  manageMochiSocialAlphaAdmin,
  type MochiSocialAlphaAdmin,
  type MochiSocialAlphaTester,
} from "@/lib/mochi-social/alpha";
import {
  checkLeaderGalleryModerationAccess,
  listGalleryReviewQueue,
  listInstagramPublishQueue,
  markInstagramGallerySubmissionShared,
  moderateGallerySubmission,
  publishInstagramGallerySubmission,
  reviewMemberVerification,
} from "@/lib/supabase/moderation";
import { listProfileMediaQueue, moderateProfileMedia } from "@/lib/supabase/member-profiles";
import {
  text,
  type GalleryReviewQueue,
  type GalleryReviewSubmission,
  type InstagramPublishJob,
  type InstagramPublishQueue,
  type MemberAccessVerification,
  type ModerationStatus,
  type ProfileMediaQueue,
  type ProfileMediaQueueItem,
  type ProfileMediaStatus,
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
  { id: "shared_manually", label: "Shared manually", empty: "No manually shared Instagram jobs." },
  { id: "all", label: "All", empty: "No Instagram publishing jobs." },
];

const profileMediaStatuses: Array<{ id: ProfileMediaStatus | "all"; label: string; empty: string }> = [
  { id: "pending", label: "Pending", empty: "No pending profile images." },
  { id: "approved", label: "Approved", empty: "No approved profile images." },
  { id: "rejected", label: "Rejected", empty: "No rejected profile images." },
  { id: "archived", label: "Archived", empty: "No archived profile images." },
  { id: "all", label: "All", empty: "No profile images in the queue." },
];

const memberVerificationMethods = [
  { id: "manual_review", label: "Manual Review" },
  { id: "phone", label: "Phone" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
  { id: "google", label: "Google" },
  { id: "kakao", label: "Kakao" },
  { id: "twitch", label: "Twitch" },
  { id: "spotify", label: "Spotify" },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

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

function profileMediaStatusConfig(status: string) {
  return profileMediaStatuses.find((entry) => entry.id === status) || profileMediaStatuses[0];
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

function profileMediaKindLabel(value: unknown) {
  return text(value, "avatar").toLowerCase() === "banner" ? "Banner" : "Avatar";
}

function memberVerificationMethodLabel(value: unknown) {
  const method = text(value, "manual_review").toLowerCase();
  return memberVerificationMethods.find((entry) => entry.id === method)?.label || "Manual Review";
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
  permalinkValue,
  moderatorNote,
  onCaptionChange,
  onAltTextChange,
  onPermalinkChange,
  onModeratorNoteChange,
  onCopyCaption,
  onCopyAltText,
  onMarkShared,
  onPublish,
}: {
  job: InstagramPublishJob;
  busy: boolean;
  caption: string;
  altText: string;
  permalinkValue: string;
  moderatorNote: string;
  onCaptionChange: (value: string) => void;
  onAltTextChange: (value: string) => void;
  onPermalinkChange: (value: string) => void;
  onModeratorNoteChange: (value: string) => void;
  onCopyCaption: () => void;
  onCopyAltText: () => void;
  onMarkShared: (job: InstagramPublishJob) => void;
  onPublish: (job: InstagramPublishJob) => void;
}) {
  const submission = job.submission || {};
  const title = text(submission.title || submission.originalFilename, "Untitled image");
  const sourceLabel = text(submission.source, "website").toLowerCase() === "discord" ? "Discord" : "Website";
  const status = text(job.status, "queued").toLowerCase();
  const canPublish = status === "queued" || status === "failed";
  const canShareManually = status === "queued";
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
            ["Consent source", submission.instagramOptInSource || "Not set"],
            ["Type", submission.mimeType || "Unknown"],
            ["Size", formatBytes(submission.sizeBytes)],
            ["Attempts", String(job.attemptCount || 0)],
            ["Queued", formatDate(job.createdAt, "Not set")],
            ["Completed", job.publishedAt ? formatDate(job.publishedAt, "Not completed") : "Not completed"],
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
        <label className="form-field">
          <span>Instagram permalink after manual post</span>
          <input
            type="url"
            maxLength={500}
            value={permalinkValue}
            disabled={busy || !canShareManually}
            onChange={(event) => onPermalinkChange(event.target.value.slice(0, 500))}
            placeholder="https://www.instagram.com/p/..."
          />
        </label>
        <label className="form-field">
          <span>Manual share note</span>
          <textarea
            maxLength={500}
            rows={2}
            value={moderatorNote}
            disabled={busy || !canShareManually}
            onChange={(event) => onModeratorNoteChange(event.target.value.slice(0, 500))}
            placeholder="Optional moderator note."
          />
        </label>
        <div className="auth-actions">
          {job.signedPreviewUrl ? (
            <a className="hero-cta" href={job.signedPreviewUrl} download target="_blank" rel="noopener noreferrer">Download image</a>
          ) : (
            <button className="hero-cta" type="button" disabled>Download image</button>
          )}
          <button className="hero-cta" type="button" disabled={busy || !caption.trim()} onClick={onCopyCaption}>Copy caption</button>
          <button className="hero-cta" type="button" disabled={busy || !altText.trim()} onClick={onCopyAltText}>Copy alt text</button>
          <button
            className="hero-cta hero-cta--primary"
            type="button"
            disabled={busy || !canShareManually}
            onClick={() => onMarkShared(job)}
          >
            Mark shared manually
          </button>
          <button
            className="hero-cta"
            type="button"
            disabled
            onClick={() => onPublish(job)}
          >
            Meta API unavailable
          </button>
        </div>
      </div>
    </article>
  );
}

function ProfileMediaCard({
  item,
  busy,
  reason,
  onReasonChange,
  onModerate,
}: {
  item: ProfileMediaQueueItem;
  busy: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onModerate: (item: ProfileMediaQueueItem, action: "approved" | "rejected") => void;
}) {
  const status = text(item.status, "pending").toLowerCase();
  const kind = profileMediaKindLabel(item.kind);
  const uploader = item.uploader || {};
  const title = `${kind} image`;

  return (
    <article className={`review-item review-item--${status}`} data-profile-media-id={item.id || ""}>
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
            <p className="muted">{uploader.displayName || uploader.discordGlobalName || uploader.discordUsername || "Mochirii Member"}</p>
          </div>
          <span className={`submission-status submission-status--${status}`}>{status}</span>
        </div>
        {status === "rejected" && item.rejectionReason ? <p className="review-decision">Reason: {item.rejectionReason}</p> : null}
        <dl className="review-meta">
          {[
            ["Kind", kind],
            ["Type", item.mimeType || "Unknown"],
            ["Size", formatBytes(item.sizeBytes)],
            ["Submitted", formatDate(item.createdAt, "Not set")],
            ["Reviewed", item.reviewedAt ? formatDate(item.reviewedAt, "Not reviewed") : "Not reviewed"],
            ["Filename", item.originalFilename || "Not set"],
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
        {status === "pending" ? (
          <>
            <label className="form-field review-reason">
              <span>Decline reason</span>
              <textarea
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

function AlphaTesterRow({
  tester,
  busy,
  onRevoke,
}: {
  tester: MochiSocialAlphaTester;
  busy: boolean;
  onRevoke: (tester: MochiSocialAlphaTester) => void;
}) {
  const status = text(tester.status, "unknown").toLowerCase();
  return (
    <article className={`review-item review-item--${status}`} data-mochi-alpha-tester={tester.user_id || ""}>
      <div className="review-details">
        <div className="review-details__head">
          <div>
            <h3>{tester.user_id || "Unknown tester"}</h3>
            <p className="muted">{tester.notes || "No leader note recorded."}</p>
          </div>
          <span className={`submission-status submission-status--${status}`}>{status}</span>
        </div>
        <dl className="review-meta">
          {[
            ["Updated", formatDate(tester.updated_at, "Not set")],
            ["Created", formatDate(tester.created_at, "Not set")],
            ["Invited by", tester.invited_by || "Not set"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {status === "active" ? (
          <div className="auth-actions">
            <button className="hero-cta" type="button" onClick={() => onRevoke(tester)} disabled={busy}>Revoke alpha access</button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AlphaAuditPanel({ data }: { data: MochiSocialAlphaAdmin | null }) {
  const audit = data?.audit || {};
  const summary = audit.summary || {};
  const recentLedger = Array.isArray(audit.recentLedger) ? audit.recentLedger : [];
  const recentChain = Array.isArray(audit.recentChain) ? audit.recentChain : [];
  const recentFeedback = Array.isArray(audit.recentFeedback) ? audit.recentFeedback : [];
  const cards = [
    ["Active testers", summary.activeTesters],
    ["Revoked testers", summary.revokedTesters],
    ["Ledger events", summary.ledgerEvents],
    ["Active listings", summary.activeListings],
    ["Offered trades", summary.offeredTrades],
    ["Pending chain ops", summary.pendingChainOps],
    ["Feedback", summary.feedbackCount],
    ["Chat messages", summary.chatMessages],
  ];

  return (
    <>
      <div className="moderation-summary" aria-label="Mochi Social alpha audit summary">
        {cards.map(([label, value]) => (
          <div className="moderation-summary__card" key={label}>
            <span>{label}</span>
            <strong>{value == null ? "-" : Number(value || 0)}</strong>
          </div>
        ))}
      </div>
      <div className="review-list" aria-label="Recent Mochi Social alpha audit rows">
        <details className="review-storage" open>
          <summary>Recent ledger events</summary>
          {recentLedger.length ? recentLedger.map((event) => (
            <code key={`${event.id}-${event.request_id}`}>{event.event_type || "event"} - {event.actor_id || "unknown"} - {formatDate(event.created_at, "Not set")}</code>
          )) : <p className="muted">No alpha ledger events yet.</p>}
        </details>
        <details className="review-storage">
          <summary>Recent Enjin Canary operations</summary>
          {recentChain.length ? recentChain.map((operation) => (
            <code key={operation.request_id || operation.created_at || "chain"}>{operation.operation_type || "chain"} - {operation.status || "pending"} - {operation.network || "CANARY"}</code>
          )) : <p className="muted">No Canary chain operations yet.</p>}
        </details>
        <details className="review-storage">
          <summary>Recent alpha feedback</summary>
          {recentFeedback.length ? recentFeedback.map((item) => (
            <code key={item.id || item.created_at || "feedback"}>{item.category || "alpha"} - {String(item.message || "").slice(0, 160)}</code>
          )) : <p className="muted">No alpha feedback yet.</p>}
        </details>
      </div>
    </>
  );
}

function MemberVerificationResult({
  userId,
  verification,
}: {
  userId?: string | null;
  verification?: MemberAccessVerification | null;
}) {
  if (!verification) return null;

  const status = text(verification.status, "pending").toLowerCase();
  const rows = [
    ["User", userId || "Not set"],
    ["Status", status],
    ["Method", memberVerificationMethodLabel(verification.method)],
    ["Reviewed", verification.reviewedAt ? formatDate(verification.reviewedAt, "Not set") : "Not set"],
    ["Verified", verification.verifiedAt ? formatDate(verification.verifiedAt, "Not set") : "Not set"],
    ["Expires", verification.expiresAt ? formatDate(verification.expiresAt, "No expiry") : "No expiry"],
    ["Note", verification.reason || "No note recorded"],
  ];

  return (
    <dl className="review-meta" aria-label="Last member verification review">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
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
  const [instagramPermalinks, setInstagramPermalinks] = useState<Record<string, string>>({});
  const [instagramNotes, setInstagramNotes] = useState<Record<string, string>>({});
  const [profileMediaActiveStatus, setProfileMediaActiveStatus] = useState<ProfileMediaStatus | "all">("pending");
  const [profileMediaQueue, setProfileMediaQueue] = useState<ProfileMediaQueue | null>(null);
  const [profileMediaBusy, setProfileMediaBusy] = useState(false);
  const [profileMediaStatus, setProfileMediaStatus] = useState("Profile image queue has not loaded yet.");
  const [profileMediaError, setProfileMediaError] = useState("");
  const [profileMediaReasons, setProfileMediaReasons] = useState<Record<string, string>>({});
  const [mochiAlpha, setMochiAlpha] = useState<MochiSocialAlphaAdmin | null>(null);
  const [mochiAlphaBusy, setMochiAlphaBusy] = useState(false);
  const [mochiAlphaStatus, setMochiAlphaStatus] = useState("Mochi Social alpha controls have not loaded yet.");
  const [mochiAlphaError, setMochiAlphaError] = useState("");
  const [mochiAlphaUserId, setMochiAlphaUserId] = useState("");
  const [mochiAlphaNotes, setMochiAlphaNotes] = useState("");
  const [memberVerificationUserId, setMemberVerificationUserId] = useState("");
  const [memberVerificationMethod, setMemberVerificationMethod] = useState("manual_review");
  const [memberVerificationReason, setMemberVerificationReason] = useState("");
  const [memberVerificationExpiresAt, setMemberVerificationExpiresAt] = useState("");
  const [memberVerificationBusy, setMemberVerificationBusy] = useState(false);
  const [memberVerificationStatus, setMemberVerificationStatus] = useState("Member verification review is ready.");
  const [memberVerificationError, setMemberVerificationError] = useState("");
  const [memberVerificationLast, setMemberVerificationLast] = useState<{
    userId?: string | null;
    verification?: MemberAccessVerification | null;
  } | null>(null);

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

    const requestedStatus = nextStatus === "shared_manually" ? "all" : nextStatus;
    const result = await listInstagramPublishQueue({ status: requestedStatus });
    if (!result.ok) {
      setInstagramQueue(null);
      setInstagramError(result.message || "Instagram publishing queue could not be loaded.");
      setInstagramStatus("");
      setInstagramBusy(false);
      return;
    }

    const responseData = result.data || { jobs: [] };
    const responseJobs = Array.isArray(responseData.jobs) ? responseData.jobs : [];
    const jobs = nextStatus === "shared_manually"
      ? responseJobs.filter((job) => text(job.status) === "shared_manually")
      : responseJobs;
    const data = {
      ...responseData,
      jobs,
      count: jobs.length,
      summary: {
        ...(responseData.summary || {}),
        ...(nextStatus === "shared_manually" ? { shared_manually: jobs.length } : {}),
      },
    };
    setInstagramQueue(data);
    setInstagramStatus(
      successMessage ||
        (data.jobs?.length
          ? `${data.jobs.length} ${config.label.toLowerCase()} Instagram job${data.jobs.length === 1 ? "" : "s"} shown.`
          : config.empty),
    );
    setInstagramBusy(false);
  }, [instagramActiveStatus]);

  const loadProfileMediaQueue = useCallback(async ({
    status = profileMediaActiveStatus,
    successMessage = "",
  }: {
    status?: ProfileMediaStatus | "all";
    successMessage?: string;
  } = {}) => {
    const nextStatus = profileMediaStatusConfig(status).id;
    const config = profileMediaStatusConfig(nextStatus);
    setProfileMediaActiveStatus(nextStatus);
    setProfileMediaBusy(true);
    setProfileMediaError("");
    setProfileMediaStatus(`Loading ${config.label.toLowerCase()} profile images.`);

    const result = await listProfileMediaQueue(nextStatus);
    if (!result.ok) {
      setProfileMediaQueue(null);
      setProfileMediaError(result.message || "Profile image queue could not be loaded.");
      setProfileMediaStatus("");
      setProfileMediaBusy(false);
      return;
    }

    const data = result.data || { media: [] };
    setProfileMediaQueue(data);
    setProfileMediaStatus(
      successMessage ||
        (data.media?.length
          ? `${data.media.length} ${config.label.toLowerCase()} profile image${data.media.length === 1 ? "" : "s"} shown.`
          : config.empty),
    );
    setProfileMediaBusy(false);
  }, [profileMediaActiveStatus]);

  const loadMochiAlpha = useCallback(async ({ successMessage = "" }: { successMessage?: string } = {}) => {
    setMochiAlphaBusy(true);
    setMochiAlphaError("");
    setMochiAlphaStatus("Loading Mochi Social alpha access and audit state.");

    const result = await manageMochiSocialAlphaAdmin({ action: "list" });
    if (!result.ok) {
      setMochiAlpha(null);
      setMochiAlphaError(result.message || "Mochi Social alpha controls could not be loaded.");
      setMochiAlphaStatus("");
      setMochiAlphaBusy(false);
      return;
    }

    const data = result.data || { testers: [] };
    setMochiAlpha(data);
    setMochiAlphaStatus(successMessage || `${data.testers?.length || 0} Mochi Social alpha tester${data.testers?.length === 1 ? "" : "s"} shown.`);
    setMochiAlphaBusy(false);
  }, []);

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
    await loadProfileMediaQueue({ status: profileMediaActiveStatus });
    await loadMochiAlpha();
  }, [activeStatus, instagramActiveStatus, loadInstagramQueue, loadMochiAlpha, loadProfileMediaQueue, loadQueue, profileMediaActiveStatus]);

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

  async function reviewVerification(action: "approve" | "reject" | "revoke") {
    const userId = memberVerificationUserId.trim();
    const reason = memberVerificationReason.trim();

    if (!UUID_RE.test(userId)) {
      setMemberVerificationError("Enter a valid Supabase user id before reviewing member verification.");
      return;
    }

    if ((action === "reject" || action === "revoke") && reason.length < 2) {
      setMemberVerificationError("Add a redacted note before rejecting or revoking member verification.");
      return;
    }

    setMemberVerificationBusy(true);
    setMemberVerificationError("");
    setMemberVerificationStatus(
      action === "approve"
        ? "Approving member verification."
        : action === "reject"
          ? "Rejecting member verification."
          : "Revoking member verification.",
    );

    const result = await reviewMemberVerification({
      userId,
      action,
      method: memberVerificationMethod,
      reason,
      expiresAt: memberVerificationExpiresAt,
    });

    if (!result.ok) {
      setMemberVerificationError(result.message || "Member verification review could not be saved.");
      setMemberVerificationStatus("");
      setMemberVerificationBusy(false);
      return;
    }

    setMemberVerificationLast(result.data || { userId, verification: null });
    setMemberVerificationStatus(result.message || "Member verification review saved.");
    setMemberVerificationBusy(false);
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

  async function copyInstagramText(value: string, label: string) {
    const clean = value.trim();
    if (!clean) {
      setInstagramError(`${label} is empty.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(clean);
      setInstagramError("");
      setInstagramStatus(`${label} copied.`);
    } catch {
      setInstagramError(`${label} could not be copied by this browser.`);
    }
  }

  async function markSharedManually(job: InstagramPublishJob) {
    const jobId = text(job.id);
    const instagramPermalink = instagramPermalinks[jobId] ?? text(job.instagramPermalink);
    const moderatorNote = instagramNotes[jobId] ?? "";
    const confirmed =
      typeof window !== "undefined" &&
      window.confirm("Mark this Instagram queue item as shared manually after posting from the official account?");

    if (!confirmed) return;

    setInstagramBusy(true);
    setInstagramError("");
    setInstagramStatus("Marking Instagram job as shared manually.");

    const result = await markInstagramGallerySubmissionShared({
      jobId,
      instagramPermalink,
      moderatorNote,
      confirmManualShare: true,
    });

    if (!result.ok) {
      setInstagramError(result.message || "Instagram job could not be marked shared manually.");
      setInstagramStatus("");
      setInstagramBusy(false);
      await loadInstagramQueue({ status: instagramActiveStatus });
      return;
    }

    await loadInstagramQueue({
      status: instagramActiveStatus,
      successMessage: result.message || "Instagram job marked as shared manually.",
    });
  }

  async function moderateProfileImage(item: ProfileMediaQueueItem, action: "approved" | "rejected") {
    const mediaId = text(item.id);
    const reason = text(profileMediaReasons[mediaId]);

    if (action === "rejected" && reason.length < 2) {
      setProfileMediaError("Add a decline reason before rejecting this profile image.");
      return;
    }

    setProfileMediaBusy(true);
    setProfileMediaError("");
    setProfileMediaStatus(action === "approved" ? "Approving profile image." : "Declining profile image.");
    const result = await moderateProfileMedia(mediaId, action, reason);
    if (!result.ok) {
      setProfileMediaError(result.message || "Profile image could not be moderated.");
      setProfileMediaStatus("");
      setProfileMediaBusy(false);
      return;
    }

    await loadProfileMediaQueue({
      status: profileMediaActiveStatus,
      successMessage: result.message || "Profile image moderated.",
    });
  }

  async function grantMochiAlphaAccess() {
    const userId = mochiAlphaUserId.trim();
    if (!userId) {
      setMochiAlphaError("Enter a Supabase user id before granting alpha access.");
      return;
    }

    setMochiAlphaBusy(true);
    setMochiAlphaError("");
    setMochiAlphaStatus("Granting Mochi Social alpha access.");
    const result = await manageMochiSocialAlphaAdmin({
      action: "grant",
      user_id: userId,
      notes: mochiAlphaNotes.trim(),
    });

    if (!result.ok) {
      setMochiAlphaError(result.message || "Mochi Social alpha access could not be granted.");
      setMochiAlphaStatus("");
      setMochiAlphaBusy(false);
      return;
    }

    setMochiAlphaUserId("");
    setMochiAlphaNotes("");
    setMochiAlpha(result.data || { testers: [] });
    setMochiAlphaStatus(result.message || "Mochi Social alpha access granted.");
    setMochiAlphaBusy(false);
  }

  async function revokeMochiAlphaAccess(tester: MochiSocialAlphaTester) {
    const userId = text(tester.user_id);
    if (!userId) return;
    const confirmed =
      typeof window !== "undefined" &&
      window.confirm("Revoke Mochi Social alpha access for this tester?");
    if (!confirmed) return;

    setMochiAlphaBusy(true);
    setMochiAlphaError("");
    setMochiAlphaStatus("Revoking Mochi Social alpha access.");
    const result = await manageMochiSocialAlphaAdmin({
      action: "revoke",
      user_id: userId,
      notes: mochiAlphaNotes.trim() || "Revoked from leader dashboard.",
    });

    if (!result.ok) {
      setMochiAlphaError(result.message || "Mochi Social alpha access could not be revoked.");
      setMochiAlphaStatus("");
      setMochiAlphaBusy(false);
      return;
    }

    setMochiAlpha(result.data || { testers: [] });
    setMochiAlphaStatus(result.message || "Mochi Social alpha access revoked.");
    setMochiAlphaBusy(false);
  }

  if (panel === "signed-out") {
    return (
      <section className="glass-card glass-card--primary glass-pad auth-panel" id="signedOutPanel">
        <p className="kicker">Sign In Required</p>
        <h2 className="section-title">Sign In Required</h2>
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
  const profileMediaItems = Array.isArray(profileMediaQueue?.media) ? profileMediaQueue.media : [];
  const profileMediaConfig = profileMediaStatusConfig(profileMediaActiveStatus);
  const mochiAlphaTesters = Array.isArray(mochiAlpha?.testers) ? mochiAlpha.testers : [];

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
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="memberVerificationPanel">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Member Verification</p>
          <h2 className="section-title">Review Gallery Access</h2>
        </div>
        <span className="status-pill">Moderator only</span>
      </div>

      <div className="review-details">
        <label className="form-field">
          <span>Supabase user id</span>
          <input
            value={memberVerificationUserId}
            onChange={(event) => setMemberVerificationUserId(event.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            disabled={memberVerificationBusy}
          />
        </label>
        <label className="form-field">
          <span>Verification method</span>
          <select
            value={memberVerificationMethod}
            onChange={(event) => setMemberVerificationMethod(event.target.value)}
            disabled={memberVerificationBusy}
          >
            {memberVerificationMethods.map((method) => (
              <option value={method.id} key={method.id}>{method.label}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Expiry</span>
          <input
            type="datetime-local"
            value={memberVerificationExpiresAt}
            onChange={(event) => setMemberVerificationExpiresAt(event.target.value)}
            disabled={memberVerificationBusy}
          />
        </label>
        <label className="form-field">
          <span>Redacted note</span>
          <textarea
            maxLength={500}
            rows={3}
            value={memberVerificationReason}
            onChange={(event) => setMemberVerificationReason(event.target.value.slice(0, 500))}
            placeholder="Short approval, rejection, or revoke note. Do not paste private messages."
            disabled={memberVerificationBusy}
          />
        </label>
        <div className="auth-actions">
          <button className="hero-cta hero-cta--primary" type="button" onClick={() => reviewVerification("approve")} disabled={memberVerificationBusy}>
            Approve access
          </button>
          <button className="hero-cta" type="button" onClick={() => reviewVerification("reject")} disabled={memberVerificationBusy}>
            Reject
          </button>
          <button className="hero-cta" type="button" onClick={() => reviewVerification("revoke")} disabled={memberVerificationBusy}>
            Revoke
          </button>
        </div>
        <p className="auth-status muted" role="status" aria-live="polite">{memberVerificationStatus}</p>
        <p className="auth-error" role="alert" hidden={!memberVerificationError}>{memberVerificationError}</p>
        <MemberVerificationResult userId={memberVerificationLast?.userId} verification={memberVerificationLast?.verification} />
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
                permalinkValue={instagramPermalinks[id] ?? text(job.instagramPermalink)}
                moderatorNote={instagramNotes[id] ?? ""}
                key={id}
                onCaptionChange={(value) => setInstagramCaptions((current) => ({ ...current, [id]: value }))}
                onAltTextChange={(value) => setInstagramAltTexts((current) => ({ ...current, [id]: value }))}
                onPermalinkChange={(value) => setInstagramPermalinks((current) => ({ ...current, [id]: value }))}
                onModeratorNoteChange={(value) => setInstagramNotes((current) => ({ ...current, [id]: value }))}
                onCopyCaption={() => copyInstagramText(instagramCaptions[id] ?? text(job.caption, "Shared from the MÅchirÄ«Ä« guild gallery."), "Instagram caption")}
                onCopyAltText={() => copyInstagramText(instagramAltTexts[id] ?? text(job.altText), "Instagram alt text")}
                onMarkShared={markSharedManually}
                onPublish={publishInstagram}
              />
            );
          })
        ) : (
          <p className="muted">{instagramConfig.empty}</p>
        )}
      </div>
    </section>
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="profileMediaQueuePanel">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Profile Media</p>
          <h2 className="section-title">Avatar And Banner Review</h2>
        </div>
        <button className="hero-cta" type="button" onClick={() => loadProfileMediaQueue({ status: profileMediaActiveStatus })} disabled={profileMediaBusy}>Refresh</button>
      </div>

      <div className="queue-tabs" role="group" aria-label="Profile media queues">
        {profileMediaStatuses.map((status) => (
          <button
            className="queue-tab"
            type="button"
            data-status={status.id}
            aria-pressed={status.id === profileMediaActiveStatus}
            disabled={profileMediaBusy}
            key={status.id}
            onClick={() => loadProfileMediaQueue({ status: status.id })}
          >
            {status.label} - {Number(profileMediaQueue?.summary?.[status.id === "all" ? "total" : status.id] || 0)}
          </button>
        ))}
      </div>

      <p className="auth-status muted" role="status" aria-live="polite">{profileMediaStatus}</p>
      <p className="auth-error" role="alert" hidden={!profileMediaError}>{profileMediaError}</p>

      <div className="review-list" aria-live="polite">
        {profileMediaItems.length ? (
          profileMediaItems.map((item) => {
            const id = text(item.id, "unknown");
            return (
              <ProfileMediaCard
                item={item}
                busy={profileMediaBusy}
                reason={profileMediaReasons[id] || ""}
                key={id}
                onReasonChange={(value) => setProfileMediaReasons((current) => ({ ...current, [id]: value.slice(0, 500) }))}
                onModerate={moderateProfileImage}
              />
            );
          })
        ) : (
          <p className="muted">{profileMediaConfig.empty}</p>
        )}
      </div>
    </section>
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="mochiSocialAlphaPanel">
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Mochi Social Alpha</p>
          <h2 className="section-title">Access And Audit</h2>
        </div>
        <button className="hero-cta" type="button" onClick={() => loadMochiAlpha()} disabled={mochiAlphaBusy}>Refresh</button>
      </div>

      <div className="review-details">
        <label className="form-field">
          <span>Supabase user id</span>
          <input
            value={mochiAlphaUserId}
            onChange={(event) => setMochiAlphaUserId(event.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            disabled={mochiAlphaBusy}
          />
        </label>
        <label className="form-field">
          <span>Leader note</span>
          <textarea
            maxLength={500}
            rows={3}
            value={mochiAlphaNotes}
            onChange={(event) => setMochiAlphaNotes(event.target.value.slice(0, 500))}
            placeholder="Closed alpha invite reason, cohort, or revoke note."
            disabled={mochiAlphaBusy}
          />
        </label>
        <div className="auth-actions">
          <button className="hero-cta hero-cta--primary" type="button" onClick={grantMochiAlphaAccess} disabled={mochiAlphaBusy || !mochiAlphaUserId.trim()}>
            Grant alpha access
          </button>
        </div>
      </div>

      <AlphaAuditPanel data={mochiAlpha} />

      <p className="auth-status muted" role="status" aria-live="polite">{mochiAlphaStatus}</p>
      <p className="auth-error" role="alert" hidden={!mochiAlphaError}>{mochiAlphaError}</p>

      <div className="review-list" aria-live="polite">
        {mochiAlphaTesters.length ? (
          mochiAlphaTesters.map((tester) => (
            <AlphaTesterRow
              tester={tester}
              busy={mochiAlphaBusy}
              key={tester.user_id || `${tester.status}-${tester.updated_at}`}
              onRevoke={revokeMochiAlphaAccess}
            />
          ))
        ) : (
          <p className="muted">No Mochi Social alpha testers yet.</p>
        )}
      </div>
    </section>
    </>
  );
}
