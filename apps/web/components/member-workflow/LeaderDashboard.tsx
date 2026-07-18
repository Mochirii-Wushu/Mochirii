"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { requireAuth, onAuthStateChange } from "@/lib/supabase/auth";
import {
  manageMochiPetsAlphaAdmin,
  type MochiPetsAlphaAdmin,
  type MochiPetsAlphaTester,
} from "@/lib/mochi-pets/alpha";
import {
  checkInstagramApiStatus,
  checkLeaderGalleryModerationAccess,
  deleteRejectedGallerySubmission,
  listGalleryReviewQueue,
  listInstagramPublishQueue,
  markInstagramGallerySubmissionShared,
  moderateGallerySubmission,
  publishInstagramGallerySubmission,
  reviewMemberVerification,
} from "@/lib/supabase/moderation";
import {
  text,
  type GalleryReviewQueue,
  type GalleryReviewSubmission,
  type InstagramApiStatus,
  type InstagramPublishJob,
  type InstagramPublishQueue,
  type MemberAccessVerification,
  type ModerationStatus,
} from "@/lib/supabase/types";
import {
  AlphaAuditPanel,
  AlphaTesterRow,
  InstagramApiStatusCard,
  InstagramJobCard,
  MemberVerificationResult,
  QueueSummary,
  SubmissionCard,
  instagramStatusConfig,
  instagramStatuses,
  memberVerificationMethods,
  normalizeStatus,
  statusConfig,
  statuses,
  type InstagramAction,
  type InstagramJobMessage,
} from "./LeaderDashboardParts";
import { WorkflowEmptyState, WorkflowNotice } from "./WorkflowState";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function LeaderDashboard() {
  const [busy, setBusy] = useState(true);
  const [panel, setPanel] = useState<"signed-out" | "denied" | "review">("signed-out");
  const [activeStatus, setActiveStatus] = useState<ModerationStatus>("pending");
  const [queue, setQueue] = useState<GalleryReviewQueue | null>(null);
  const [reviewStatus, setReviewStatus] = useState("Loading pending submissions.");
  const [reviewError, setReviewError] = useState("");
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("Gallery moderation requires Discord membership, completed onboarding, and the Moderator role.");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [cleanupConfirmations, setCleanupConfirmations] = useState<Record<string, boolean | undefined>>({});
  const [cleanupBusyId, setCleanupBusyId] = useState("");
  const [instagramActiveStatus, setInstagramActiveStatus] = useState("queued");
  const [instagramQueue, setInstagramQueue] = useState<InstagramPublishQueue | null>(null);
  const [instagramApiStatus, setInstagramApiStatus] = useState<InstagramApiStatus | null>(null);
  const [instagramBusy, setInstagramBusy] = useState(false);
  const [instagramApiBusy, setInstagramApiBusy] = useState(false);
  const [instagramBusyJobId, setInstagramBusyJobId] = useState("");
  const [instagramStatus, setInstagramStatus] = useState("Instagram queue has not loaded yet.");
  const [instagramError, setInstagramError] = useState("");
  const [instagramCaptions, setInstagramCaptions] = useState<Record<string, string>>({});
  const [instagramAltTexts, setInstagramAltTexts] = useState<Record<string, string>>({});
  const [instagramPermalinks, setInstagramPermalinks] = useState<Record<string, string>>({});
  const [instagramNotes, setInstagramNotes] = useState<Record<string, string>>({});
  const [instagramConfirmations, setInstagramConfirmations] = useState<Record<string, InstagramAction | undefined>>({});
  const [instagramJobMessages, setInstagramJobMessages] = useState<Record<string, InstagramJobMessage | undefined>>({});
  const [mochiAlpha, setMochiAlpha] = useState<MochiPetsAlphaAdmin | null>(null);
  const [mochiAlphaBusy, setMochiAlphaBusy] = useState(false);
  const [mochiAlphaStatus, setMochiAlphaStatus] = useState("Mochi Pets alpha controls have not loaded yet.");
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

  const loadInstagramApiStatus = useCallback(async (successMessage = "") => {
    setInstagramApiBusy(true);
    const result = await checkInstagramApiStatus();
    if (!result.ok) {
      setInstagramApiStatus(null);
      setInstagramError(result.message || "Meta API status could not be checked.");
      setInstagramApiBusy(false);
      return;
    }

    const data = result.data || null;
    setInstagramApiStatus(data);
    setInstagramError("");
    if (successMessage || result.message || data?.message) {
      setInstagramStatus(successMessage || result.message || data?.message || "Meta API status checked.");
    }
    setInstagramApiBusy(false);
  }, []);

  const loadMochiAlpha = useCallback(async ({ successMessage = "" }: { successMessage?: string } = {}) => {
    setMochiAlphaBusy(true);
    setMochiAlphaError("");
    setMochiAlphaStatus("Loading Mochi Pets alpha access and audit state.");

    const result = await manageMochiPetsAlphaAdmin({ action: "list" });
    if (!result.ok) {
      setMochiAlpha(null);
      setMochiAlphaError(result.message || "Mochi Pets alpha controls could not be loaded.");
      setMochiAlphaStatus("");
      setMochiAlphaBusy(false);
      return;
    }

    const data = result.data || { testers: [] };
    setMochiAlpha(data);
    setMochiAlphaStatus(successMessage || `${data.testers?.length || 0} Mochi Pets alpha tester${data.testers?.length === 1 ? "" : "s"} shown.`);
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
    await loadInstagramApiStatus();
    await loadMochiAlpha();
  }, [activeStatus, instagramActiveStatus, loadInstagramApiStatus, loadInstagramQueue, loadMochiAlpha, loadQueue]);

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

  function armRejectedCleanup(item: GalleryReviewSubmission) {
    const submissionId = text(item.id);
    if (!submissionId) {
      setReviewError("Choose a rejected gallery submission before cleanup.");
      return;
    }

    setReviewError("");
    setReviewStatus("Ready to permanently clean up this rejected submission. Confirm only for smoke-test artifacts or owner-approved cleanup.");
    setCleanupConfirmations((current) => ({ ...current, [submissionId]: true }));
  }

  function cancelRejectedCleanup(item: GalleryReviewSubmission) {
    const submissionId = text(item.id);
    if (!submissionId) return;
    setCleanupConfirmations((current) => ({ ...current, [submissionId]: undefined }));
    setReviewStatus("Rejected submission cleanup canceled.");
  }

  async function cleanupRejectedSubmission(item: GalleryReviewSubmission) {
    const submissionId = text(item.id);
    if (!submissionId) {
      setReviewError("Choose a rejected gallery submission before cleanup.");
      return;
    }

    if (!cleanupConfirmations[submissionId]) {
      armRejectedCleanup(item);
      return;
    }

    setBusy(true);
    setCleanupBusyId(submissionId);
    setReviewError("");
    setReviewStatus("Deleting rejected submission and its Storage object.");

    const result = await deleteRejectedGallerySubmission(submissionId, true);
    if (!result.ok) {
      setReviewError(result.message || "Rejected submission cleanup failed.");
      setReviewStatus("");
      setCleanupBusyId("");
      setBusy(false);
      return;
    }

    setCleanupConfirmations((current) => ({ ...current, [submissionId]: undefined }));
    setCleanupBusyId("");
    await loadQueue({
      status: activeStatus,
      successMessage: result.message || "Rejected submission cleaned up.",
    });
  }

  async function reviewVerification(action: "approve" | "reject" | "revoke") {
    const userId = memberVerificationUserId.trim();
    const reason = memberVerificationReason.trim();

    if (!UUID_RE.test(userId)) {
      setMemberVerificationError("Enter a valid Member user ID before reviewing member verification.");
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

  function setInstagramJobMessage(jobId: string, message: InstagramJobMessage | undefined) {
    setInstagramJobMessages((current) => ({
      ...current,
      [jobId]: message,
    }));
  }

  function armInstagramAction(job: InstagramPublishJob, action: InstagramAction) {
    const jobId = text(job.id);
    if (!jobId) {
      setInstagramError("Choose an Instagram publishing job before continuing.");
      return;
    }

    setInstagramError("");
    setInstagramConfirmations((current) => ({ ...current, [jobId]: action }));
    setInstagramJobMessage(
      jobId,
      action === "manual-share"
        ? {
          kind: "status",
          message: "Ready to confirm manual sharing after the image has been posted from the official account.",
        }
        : {
          kind: "status",
          message: "Ready to confirm Meta API publishing. Use only with action-time approval.",
        },
    );
  }

  function cancelInstagramAction(job: InstagramPublishJob) {
    const jobId = text(job.id);
    if (!jobId) return;
    setInstagramConfirmations((current) => ({ ...current, [jobId]: undefined }));
    setInstagramJobMessage(jobId, undefined);
  }

  async function publishInstagram(job: InstagramPublishJob) {
    const jobId = text(job.id);
    const caption = instagramCaptions[jobId] ?? text(job.caption, "Shared from the Mōchirīī guild gallery.");
    const altText = instagramAltTexts[jobId] ?? text(job.altText);
    const metaApiReady = Boolean(instagramApiStatus?.configured && instagramApiStatus.accountReachable && instagramApiStatus.publishEnabled);

    if (!metaApiReady) {
      setInstagramJobMessage(jobId, {
        kind: "error",
        message: "Meta API publishing is unavailable until the diagnostic passes.",
      });
      return;
    }

    if (instagramConfirmations[jobId] !== "publish") {
      armInstagramAction(job, "publish");
      return;
    }

    setInstagramBusyJobId(jobId);
    setInstagramError("");
    setInstagramStatus("Publishing image to Instagram.");
    setInstagramJobMessage(jobId, { kind: "status", message: "Publishing image to Instagram through the Meta API." });

    const result = await publishInstagramGallerySubmission({
      jobId,
      caption,
      altText,
      confirmPublish: true,
    });

    if (!result.ok) {
      setInstagramJobMessage(jobId, {
        kind: "error",
        message: result.message || "Instagram publishing failed.",
      });
      setInstagramError(result.message || "Instagram publishing failed.");
      setInstagramStatus("");
      setInstagramBusyJobId("");
      await loadInstagramQueue({ status: instagramActiveStatus });
      return;
    }

    setInstagramConfirmations((current) => ({ ...current, [jobId]: undefined }));
    setInstagramJobMessage(jobId, {
      kind: "success",
      message: result.message || "Image published to Instagram.",
    });
    setInstagramBusyJobId("");
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

    if (instagramConfirmations[jobId] !== "manual-share") {
      armInstagramAction(job, "manual-share");
      return;
    }

    setInstagramBusyJobId(jobId);
    setInstagramError("");
    setInstagramStatus("Marking Instagram job as shared manually.");
    setInstagramJobMessage(jobId, { kind: "status", message: "Marking this Instagram job as shared manually." });

    const result = await markInstagramGallerySubmissionShared({
      jobId,
      instagramPermalink,
      moderatorNote,
      confirmManualShare: true,
    });

    if (!result.ok) {
      setInstagramJobMessage(jobId, {
        kind: "error",
        message: result.message || "Instagram job could not be marked shared manually.",
      });
      setInstagramError(result.message || "Instagram job could not be marked shared manually.");
      setInstagramStatus("");
      setInstagramBusyJobId("");
      await loadInstagramQueue({ status: instagramActiveStatus });
      return;
    }

    setInstagramConfirmations((current) => ({ ...current, [jobId]: undefined }));
    setInstagramJobMessage(jobId, {
      kind: "success",
      message: result.message || "Instagram job marked as shared manually.",
    });
    setInstagramBusyJobId("");
    await loadInstagramQueue({
      status: instagramActiveStatus,
      successMessage: `${result.message || "Instagram job marked as shared manually."} It is now listed under Shared manually.`,
    });
  }

  async function grantMochiAlphaAccess() {
    const userId = mochiAlphaUserId.trim();
    if (!userId) {
      setMochiAlphaError("Enter a Member user ID before granting alpha access.");
      return;
    }

    setMochiAlphaBusy(true);
    setMochiAlphaError("");
    setMochiAlphaStatus("Granting Mochi Pets alpha access.");
    const result = await manageMochiPetsAlphaAdmin({
      action: "grant",
      user_id: userId,
      notes: mochiAlphaNotes.trim(),
    });

    if (!result.ok) {
      setMochiAlphaError(result.message || "Mochi Pets alpha access could not be granted.");
      setMochiAlphaStatus("");
      setMochiAlphaBusy(false);
      return;
    }

    setMochiAlphaUserId("");
    setMochiAlphaNotes("");
    setMochiAlpha(result.data || { testers: [] });
    setMochiAlphaStatus(result.message || "Mochi Pets alpha access granted.");
    setMochiAlphaBusy(false);
  }

  async function revokeMochiAlphaAccess(tester: MochiPetsAlphaTester) {
    const userId = text(tester.user_id);
    if (!userId) return;
    const confirmed =
      typeof window !== "undefined" &&
      window.confirm("Revoke Mochi Pets alpha access for this tester?");
    if (!confirmed) return;

    setMochiAlphaBusy(true);
    setMochiAlphaError("");
    setMochiAlphaStatus("Revoking Mochi Pets alpha access.");
    const result = await manageMochiPetsAlphaAdmin({
      action: "revoke",
      user_id: userId,
      notes: mochiAlphaNotes.trim() || "Revoked from leader dashboard.",
    });

    if (!result.ok) {
      setMochiAlphaError(result.message || "Mochi Pets alpha access could not be revoked.");
      setMochiAlphaStatus("");
      setMochiAlphaBusy(false);
      return;
    }

    setMochiAlpha(result.data || { testers: [] });
    setMochiAlphaStatus(result.message || "Mochi Pets alpha access revoked.");
    setMochiAlphaBusy(false);
  }

  if (panel === "signed-out") {
    return (
      <section className="glass-card glass-card--primary glass-pad auth-panel" id="signedOutPanel" aria-busy={busy}>
        <p className="kicker">Sign In Required</p>
        <h2 className="section-title">Sign In Required</h2>
        <WorkflowNotice>Moderator access is checked against Discord after website sign-in.</WorkflowNotice>
        <div className="auth-actions">
          <Link className="hero-cta hero-cta--primary" href="/auth">Login</Link>
          <Link className="hero-cta" href="/account">Account</Link>
        </div>
      </section>
    );
  }

  if (panel === "denied") {
    return (
      <section className="glass-card glass-card--primary glass-pad auth-panel" id="accessDeniedPanel" aria-busy={busy}>
        <p className="kicker">Access Denied</p>
        <h2 className="section-title">Moderator Role Required</h2>
        <WorkflowNotice id="accessDeniedMessage" tone="warning">{accessDeniedMessage}</WorkflowNotice>
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
  const mochiAlphaTesters = Array.isArray(mochiAlpha?.testers) ? mochiAlpha.testers : [];

  return (
    <>
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="reviewPanel" aria-busy={busy}>
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

      <WorkflowNotice id="reviewStatus" hidden={!reviewStatus}>{reviewStatus}</WorkflowNotice>
      <WorkflowNotice id="reviewError" tone="danger" role="alert" hidden={!reviewError}>{reviewError}</WorkflowNotice>

      <div className="review-list" id="reviewList" aria-live="polite">
        {submissions.length ? (
          submissions.map((item) => {
            const id = text(item.id, "unknown");
            return (
              <SubmissionCard
                item={item}
                activeStatus={activeStatus}
                busy={busy || cleanupBusyId === id}
                reason={reasons[id] || ""}
                cleanupArmed={Boolean(cleanupConfirmations[id])}
                key={id}
                onReasonChange={(value) => setReasons((current) => ({ ...current, [id]: value.slice(0, 500) }))}
                onModerate={moderate}
                onArmCleanup={armRejectedCleanup}
                onCancelCleanup={cancelRejectedCleanup}
                onDeleteRejected={cleanupRejectedSubmission}
              />
            );
          })
        ) : (
          <WorkflowEmptyState title={busy ? "Loading submissions" : "No submissions shown"}>
            {busy ? "Checking the moderation queue." : config.empty}
          </WorkflowEmptyState>
        )}
      </div>
    </section>
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="memberVerificationPanel" aria-busy={memberVerificationBusy}>
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Member Verification</p>
          <h2 className="section-title">Review Gallery Access</h2>
        </div>
        <span className="status-pill">Moderator only</span>
      </div>

      <div className="review-details">
        <label className="form-field">
          <span>Member user ID</span>
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
        <WorkflowNotice hidden={!memberVerificationStatus}>{memberVerificationStatus}</WorkflowNotice>
        <WorkflowNotice tone="danger" role="alert" hidden={!memberVerificationError}>{memberVerificationError}</WorkflowNotice>
        <MemberVerificationResult userId={memberVerificationLast?.userId} verification={memberVerificationLast?.verification} />
      </div>
    </section>
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="instagramQueuePanel" aria-busy={instagramBusy}>
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

      <WorkflowNotice hidden={!instagramStatus}>{instagramStatus}</WorkflowNotice>
      <WorkflowNotice tone="danger" role="alert" hidden={!instagramError}>{instagramError}</WorkflowNotice>

      <InstagramApiStatusCard
        status={instagramApiStatus}
        busy={instagramApiBusy}
        onRefresh={() => void loadInstagramApiStatus("Meta API status checked.")}
      />

      <div className="review-list" aria-live="polite">
        {instagramJobs.length ? (
          instagramJobs.map((job) => {
            const id = text(job.id, "unknown");
            const metaPublishAvailable = Boolean(instagramApiStatus?.configured && instagramApiStatus.accountReachable && instagramApiStatus.publishEnabled);
            return (
              <InstagramJobCard
                job={job}
                busy={instagramBusy || instagramBusyJobId === id}
                caption={instagramCaptions[id] ?? text(job.caption, "Shared from the Mōchirīī guild gallery.")}
                altText={instagramAltTexts[id] ?? text(job.altText)}
                permalinkValue={instagramPermalinks[id] ?? text(job.instagramPermalink)}
                moderatorNote={instagramNotes[id] ?? ""}
                confirmation={instagramConfirmations[id]}
                jobMessage={instagramJobMessages[id]}
                metaPublishAvailable={metaPublishAvailable}
                key={id}
                onCaptionChange={(value) => setInstagramCaptions((current) => ({ ...current, [id]: value }))}
                onAltTextChange={(value) => setInstagramAltTexts((current) => ({ ...current, [id]: value }))}
                onPermalinkChange={(value) => setInstagramPermalinks((current) => ({ ...current, [id]: value }))}
                onModeratorNoteChange={(value) => setInstagramNotes((current) => ({ ...current, [id]: value }))}
                onCopyCaption={() => copyInstagramText(instagramCaptions[id] ?? text(job.caption, "Shared from the Mōchirīī guild gallery."), "Instagram caption")}
                onCopyAltText={() => copyInstagramText(instagramAltTexts[id] ?? text(job.altText), "Instagram alt text")}
                onArmManualShare={(item) => armInstagramAction(item, "manual-share")}
                onConfirmManualShare={markSharedManually}
                onArmPublish={(item) => armInstagramAction(item, "publish")}
                onConfirmPublish={publishInstagram}
                onCancelAction={cancelInstagramAction}
              />
            );
          })
        ) : (
          <WorkflowEmptyState title={instagramBusy ? "Loading Instagram jobs" : "No Instagram jobs shown"}>
            {instagramBusy ? "Checking the Instagram publishing queue." : instagramConfig.empty}
          </WorkflowEmptyState>
        )}
      </div>
    </section>
    <section className="glass-card glass-card--primary glass-pad auth-panel" id="mochiPetsAlphaPanel" aria-busy={mochiAlphaBusy}>
      <div className="auth-panel__head">
        <div>
          <p className="kicker">Mochi Pets Alpha</p>
          <h2 className="section-title">Access And Audit</h2>
        </div>
        <button className="hero-cta" type="button" onClick={() => loadMochiAlpha()} disabled={mochiAlphaBusy}>Refresh</button>
      </div>

      <div className="review-details">
        <label className="form-field">
          <span>Member user ID</span>
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

      <WorkflowNotice hidden={!mochiAlphaStatus}>{mochiAlphaStatus}</WorkflowNotice>
      <WorkflowNotice tone="danger" role="alert" hidden={!mochiAlphaError}>{mochiAlphaError}</WorkflowNotice>

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
          <WorkflowEmptyState title={mochiAlphaBusy ? "Loading alpha testers" : "No alpha testers shown"}>
            {mochiAlphaBusy ? "Checking Mochi Pets alpha access." : "No Mochi Pets alpha testers yet."}
          </WorkflowEmptyState>
        )}
      </div>
    </section>
    </>
  );
}
