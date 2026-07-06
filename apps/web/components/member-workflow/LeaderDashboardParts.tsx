import { type MochiPetsAlphaAdmin, type MochiPetsAlphaTester } from "@/lib/mochi-pets/alpha";
import {
  text,
  type GalleryReviewQueue,
  type GalleryReviewSubmission,
  type InstagramApiStatus,
  type InstagramPublishJob,
  type MemberAccessVerification,
  type ModerationStatus,
} from "@/lib/supabase/types";
import { formatBytes, formatDate } from "./format";

export const statuses: Array<{ id: ModerationStatus; label: string; empty: string }> = [
  { id: "pending", label: "Pending", empty: "No pending gallery submissions." },
  { id: "approved", label: "Approved", empty: "No approved gallery submissions." },
  { id: "rejected", label: "Rejected", empty: "No rejected gallery submissions." },
  { id: "archived", label: "Archived", empty: "No archived gallery submissions." },
];

export const instagramStatuses: Array<{ id: string; label: string; empty: string }> = [
  { id: "queued", label: "Queued", empty: "No Instagram-ready images." },
  { id: "ineligible", label: "Ineligible", empty: "No ineligible Instagram jobs." },
  { id: "failed", label: "Failed", empty: "No failed Instagram jobs." },
  { id: "published", label: "Published", empty: "No published Instagram posts." },
  { id: "shared_manually", label: "Shared manually", empty: "No manually shared Instagram jobs." },
  { id: "all", label: "All", empty: "No Instagram publishing jobs." },
];

export const memberVerificationMethods = [
  { id: "manual_review", label: "Manual Review" },
  { id: "phone", label: "Phone" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
  { id: "google", label: "Google" },
  { id: "kakao", label: "Kakao" },
  { id: "twitch", label: "Twitch" },
  { id: "spotify", label: "Spotify" },
];

export type InstagramAction = "manual-share" | "publish";
export type InstagramJobMessage = {
  kind: "status" | "error" | "success";
  message: string;
};

export function normalizeStatus(value: unknown): ModerationStatus {
  const status = text(value, "pending").toLowerCase();
  return statuses.some((entry) => entry.id === status) ? (status as ModerationStatus) : "pending";
}

export function statusConfig(status: ModerationStatus) {
  return statuses.find((entry) => entry.id === status) || statuses[0];
}

export function instagramStatusConfig(status: string) {
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

function memberVerificationMethodLabel(value: unknown) {
  const method = text(value, "manual_review").toLowerCase();
  return memberVerificationMethods.find((entry) => entry.id === method)?.label || "Manual Review";
}

export function QueueSummary({ queue, shown }: { queue: GalleryReviewQueue | null; shown: number }) {
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

export function SubmissionCard({
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

export function InstagramJobCard({
  job,
  busy,
  caption,
  altText,
  permalinkValue,
  moderatorNote,
  confirmation,
  jobMessage,
  metaPublishAvailable,
  onCaptionChange,
  onAltTextChange,
  onPermalinkChange,
  onModeratorNoteChange,
  onCopyCaption,
  onCopyAltText,
  onArmManualShare,
  onConfirmManualShare,
  onArmPublish,
  onConfirmPublish,
  onCancelAction,
}: {
  job: InstagramPublishJob;
  busy: boolean;
  caption: string;
  altText: string;
  permalinkValue: string;
  moderatorNote: string;
  confirmation?: InstagramAction;
  jobMessage?: InstagramJobMessage;
  metaPublishAvailable: boolean;
  onCaptionChange: (value: string) => void;
  onAltTextChange: (value: string) => void;
  onPermalinkChange: (value: string) => void;
  onModeratorNoteChange: (value: string) => void;
  onCopyCaption: () => void;
  onCopyAltText: () => void;
  onArmManualShare: (job: InstagramPublishJob) => void;
  onConfirmManualShare: (job: InstagramPublishJob) => void;
  onArmPublish: (job: InstagramPublishJob) => void;
  onConfirmPublish: (job: InstagramPublishJob) => void;
  onCancelAction: (job: InstagramPublishJob) => void;
}) {
  const submission = job.submission || {};
  const title = text(submission.title || submission.originalFilename, "Untitled image");
  const sourceLabel = text(submission.source, "website").toLowerCase() === "discord" ? "Discord" : "Website";
  const status = text(job.status, "queued").toLowerCase();
  const canEditPublishText = status === "queued" || status === "failed";
  const canPublish = canEditPublishText && metaPublishAvailable;
  const canShareManually = status === "queued";
  const permalink = text(job.instagramPermalink);
  const manualShareArmed = confirmation === "manual-share";
  const publishArmed = confirmation === "publish";

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
        {jobMessage ? (
          <p className={`review-action-message review-action-message--${jobMessage.kind}`} role={jobMessage.kind === "error" ? "alert" : "status"}>
            {jobMessage.message}
          </p>
        ) : null}
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
            disabled={busy || !canEditPublishText}
            onChange={(event) => onCaptionChange(event.target.value.slice(0, 2200))}
          />
        </label>
        <label className="form-field">
          <span>Instagram alt text</span>
          <textarea
            maxLength={1000}
            rows={3}
            value={altText}
            disabled={busy || !canEditPublishText}
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
        {!canShareManually ? (
          <p className="review-action-note">Manual sharing is available only for queued Instagram jobs.</p>
        ) : null}
        {manualShareArmed ? (
          <p className="review-action-note" role="status">
            Confirm only after this image has been posted manually from the official account.
          </p>
        ) : null}
        {publishArmed ? (
          <p className="review-action-note" role="status">
            Confirm only with action-time approval to publish this image through the Meta API.
          </p>
        ) : null}
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
            onClick={() => manualShareArmed ? onConfirmManualShare(job) : onArmManualShare(job)}
          >
            {manualShareArmed ? "Confirm manual share" : "Mark shared manually"}
          </button>
          {confirmation ? (
            <button className="hero-cta" type="button" disabled={busy} onClick={() => onCancelAction(job)}>
              Cancel
            </button>
          ) : null}
          <button
            className="hero-cta"
            type="button"
            disabled={busy || !canPublish}
            onClick={() => publishArmed ? onConfirmPublish(job) : onArmPublish(job)}
          >
            {publishArmed ? "Confirm Meta publish" : metaPublishAvailable ? "Publish with Meta API" : "Meta API unavailable"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function AlphaTesterRow({
  tester,
  busy,
  onRevoke,
}: {
  tester: MochiPetsAlphaTester;
  busy: boolean;
  onRevoke: (tester: MochiPetsAlphaTester) => void;
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

export function AlphaAuditPanel({ data }: { data: MochiPetsAlphaAdmin | null }) {
  const audit = data?.audit || {};
  const summary = audit.summary || {};
  const recentLedger = Array.isArray(audit.recentLedger) ? audit.recentLedger : [];
  const recentFeedback = Array.isArray(audit.recentFeedback) ? audit.recentFeedback : [];
  const recentSharedPets = Array.isArray(audit.recentSharedPets) ? audit.recentSharedPets : [];
  const cards = [
    ["Active testers", summary.activeTesters],
    ["Revoked testers", summary.revokedTesters],
    ["Ledger events", summary.ledgerEvents],
    ["Unity players", summary.unityPlayers],
    ["Shared pet mirrors", summary.sharedPetSnapshots],
    ["Feedback", summary.feedbackCount],
    ["Chat messages", summary.chatMessages],
  ];

  return (
    <>
      <div className="moderation-summary" aria-label="Mochi Pets alpha audit summary">
        {cards.map(([label, value]) => (
          <div className="moderation-summary__card" key={label}>
            <span>{label}</span>
            <strong>{value == null ? "-" : Number(value || 0)}</strong>
          </div>
        ))}
      </div>
      <div className="review-list" aria-label="Recent Mochi Pets alpha audit rows">
        <details className="review-storage" open>
          <summary>Recent ledger events</summary>
          {recentLedger.length ? recentLedger.map((event) => (
            <code key={`${event.id}-${event.request_id}`}>{event.event_type || "event"} - {event.actor_id || "unknown"} - {formatDate(event.created_at, "Not set")}</code>
          )) : <p className="muted">No alpha ledger events yet.</p>}
        </details>
        <details className="review-storage">
          <summary>Recent shared Lirabao mirrors</summary>
          {recentSharedPets.length ? recentSharedPets.map((snapshot) => (
            <code key={`${snapshot.pet_key || "lirabao"}-${snapshot.revision || 0}`}>{snapshot.pet_key || "lirabao"} - r{snapshot.revision || 0} - {snapshot.room_key || "jade-lantern-room-alpha"}</code>
          )) : <p className="muted">No shared pet mirror rows yet.</p>}
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

export function MemberVerificationResult({
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

export function InstagramApiStatusCard({
  status,
  busy,
  onRefresh,
}: {
  status: InstagramApiStatus | null;
  busy: boolean;
  onRefresh: () => void;
}) {
  const configured = Boolean(status?.configured);
  const accountReachable = Boolean(status?.accountReachable);
  const publishEnabled = Boolean(status?.publishEnabled);
  const ready = configured && accountReachable && publishEnabled;
  const label = ready ? "Configured" : configured ? "Needs review" : "Not configured";
  const message = text(status?.message, "Meta API status has not been checked yet.");

  return (
    <div className={`review-decision instagram-api-status instagram-api-status--${ready ? "ready" : configured ? "review" : "missing"}`}>
      <div>
        <strong>Meta API Status: {label}</strong>
        <p>{message}</p>
      </div>
      <dl className="review-meta instagram-api-status__meta" aria-label="Meta API diagnostic details">
        <div>
          <dt>Account check</dt>
          <dd>{accountReachable ? "Passed" : "Not passed"}</dd>
        </div>
        <div>
          <dt>Publishing</dt>
          <dd>{publishEnabled ? "Available" : "Unavailable"}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>{status?.checkedAt ? formatDate(status.checkedAt, "Not checked") : "Not checked"}</dd>
        </div>
      </dl>
      <button className="hero-cta" type="button" onClick={onRefresh} disabled={busy}>
        {busy ? "Checking Meta API" : "Check Meta API"}
      </button>
    </div>
  );
}
