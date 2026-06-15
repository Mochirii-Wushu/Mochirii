/* leader-dashboard.js - moderator-only gallery review UI */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "leader-dashboard") return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const S = window.MochiriiSupabase;
  const U = window.MochiriiUtils;
  const STATUSES = [
    { id: "pending", label: "Pending", empty: "No pending gallery submissions." },
    { id: "approved", label: "Approved", empty: "No approved gallery submissions." },
    { id: "rejected", label: "Rejected", empty: "No rejected gallery submissions." },
    { id: "archived", label: "Archived", empty: "No archived gallery submissions." },
  ];
  const STATUS_IDS = new Set(STATUSES.map((status) => status.id));
  const INSTAGRAM_STATUSES = [
    { id: "queued", label: "Queued", empty: "No Instagram-ready images." },
    { id: "ineligible", label: "Ineligible", empty: "No ineligible Instagram jobs." },
    { id: "failed", label: "Failed", empty: "No failed Instagram jobs." },
    { id: "published", label: "Published", empty: "No published Instagram posts." },
    { id: "shared_manually", label: "Shared manually", empty: "No manually shared Instagram jobs." },
    { id: "all", label: "All", empty: "No Instagram publishing jobs." },
  ];
  const INSTAGRAM_STATUS_IDS = new Set(INSTAGRAM_STATUSES.map((status) => status.id));
  const MEMBER_VERIFICATION_METHODS = [
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

  let accessReady = false;
  let activeStatus = "pending";
  let activeInstagramStatus = "queued";
  let latestSummary = null;
  let latestInstagramSummary = null;

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value || "";
  }

  function setError(selector, message) {
    const el = $(selector);
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
  }

  function setBusy(busy) {
    $("#refreshQueue")?.toggleAttribute("disabled", busy);
    $("#queueTabs")?.querySelectorAll("button").forEach((el) => {
      el.disabled = busy;
    });
    $("#reviewList")?.querySelectorAll("button, textarea").forEach((el) => {
      el.disabled = busy;
    });
    $("#refreshInstagramQueue")?.toggleAttribute("disabled", busy);
    $("#instagramQueueTabs")?.querySelectorAll("button").forEach((el) => {
      el.disabled = busy;
    });
    $("#instagramList")?.querySelectorAll("button, textarea, input").forEach((el) => {
      el.disabled = busy;
    });
    $("#memberVerificationPanel")?.querySelectorAll("button, textarea, input, select").forEach((el) => {
      el.disabled = busy;
    });
  }

  function showPanel(panelId) {
    const reviewMode = panelId === "#reviewPanel";
    ["#signedOutPanel", "#accessDeniedPanel", "#reviewPanel", "#memberVerificationPanel", "#instagramQueuePanel"].forEach((selector) => {
      const el = $(selector);
      if (!el) return;
      if (reviewMode) {
        el.hidden = selector === "#signedOutPanel" || selector === "#accessDeniedPanel";
      } else {
        el.hidden = selector !== panelId;
      }
    });
  }

  function normalizeStatus(value) {
    const status = U.text(value, "").toLowerCase();
    return STATUS_IDS.has(status) ? status : "pending";
  }

  function statusConfig(status) {
    return STATUSES.find((entry) => entry.id === status) || STATUSES[0];
  }

  function normalizeInstagramStatus(value) {
    const status = U.text(value, "").toLowerCase();
    return INSTAGRAM_STATUS_IDS.has(status) ? status : "queued";
  }

  function instagramStatusConfig(status) {
    return INSTAGRAM_STATUSES.find((entry) => entry.id === status) || INSTAGRAM_STATUSES[0];
  }

  function memberVerificationMethodLabel(value) {
    const method = U.text(value, "manual_review").toLowerCase();
    return MEMBER_VERIFICATION_METHODS.find((entry) => entry.id === method)?.label || "Manual Review";
  }

  function formatDate(value) {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  function uploaderName(item) {
    const uploader = item.uploader || {};
    return (
      uploader.discordGlobalName ||
      uploader.displayName ||
      uploader.discordUsername ||
      "Mochirii Member"
    );
  }

  function discordDetail(item) {
    const uploader = item.uploader || {};
    if (uploader.discordGlobalName && uploader.discordUsername) {
      return `${uploader.discordGlobalName} · ${uploader.discordUsername}`;
    }
    return uploader.discordUsername || uploader.discordUserId || "Discord identity on file";
  }

  function moderatorName(event) {
    const moderator = event.moderator || {};
    return (
      moderator.discordGlobalName ||
      moderator.displayName ||
      moderator.discordUsername ||
      "Moderator"
    );
  }

  function renderQueueTabs(summary) {
    $("#queueTabs")?.querySelectorAll("[data-status]").forEach((button) => {
      const status = normalizeStatus(button.dataset.status);
      const config = statusConfig(status);
      const count = Number(summary?.[status] || 0);
      button.setAttribute("aria-pressed", status === activeStatus ? "true" : "false");
      button.textContent = `${config.label} · ${count}`;
    });
  }

  function renderInstagramQueueTabs(summary) {
    $("#instagramQueueTabs")?.querySelectorAll("[data-instagram-status]").forEach((button) => {
      const status = normalizeInstagramStatus(button.dataset.instagramStatus);
      const config = instagramStatusConfig(status);
      const count = Number(summary?.[status === "all" ? "total" : status] || 0);
      button.setAttribute("aria-pressed", status === activeInstagramStatus ? "true" : "false");
      button.textContent = `${config.label} - ${count}`;
    });
  }

  function renderSummary(summary, shown) {
    const panel = $("#queueSummary");
    if (!panel) return;

    const safeSummary = summary || {};
    const cards = [
      ["Pending", safeSummary.pending],
      ["Approved", safeSummary.approved],
      ["Rejected", safeSummary.rejected],
      ["Archived", safeSummary.archived],
      ["Shown", shown],
    ];

    panel.innerHTML = cards.map(([label, value]) => `
      <div class="moderation-summary__card">
        <span>${U.escapeHtml(label)}</span>
        <strong>${U.escapeHtml(String(Number(value || 0)))}</strong>
      </div>
    `).join("");
  }

  function renderPreview(item, title) {
    if (item.signedPreviewUrl) {
      return `<img src="${U.escapeHtml(item.signedPreviewUrl)}" alt="${U.escapeHtml(title)} preview" loading="lazy" decoding="async" />`;
    }

    return `
      <div class="review-preview__empty">
        <span>Preview unavailable</span>
      </div>
    `;
  }

  function renderMeta(item) {
    const sourceLabel = U.text(item.source, "website").toLowerCase() === "discord" ? "Discord" : "Website";
    const rows = [
      ["Status", item.status || activeStatus],
      ["Source", sourceLabel],
      ["Category", item.category || "Uncategorized"],
      ["Type", item.mimeType || "Unknown"],
      ["Size", formatBytes(item.sizeBytes)],
      ["Submitted", formatDate(item.createdAt)],
      ["Reviewed", item.reviewedAt ? formatDate(item.reviewedAt) : "Not reviewed"],
      ["Instagram", item.instagramOptIn ? "Instagram opt-in" : "Site Gallery only"],
    ];

    return `
      <dl class="review-meta">
        ${rows.map(([label, value]) => `
          <div>
            <dt>${U.escapeHtml(label)}</dt>
            <dd>${U.escapeHtml(value)}</dd>
          </div>
        `).join("")}
      </dl>
    `;
  }

  function renderHistory(item) {
    const events = Array.isArray(item.moderationEvents) ? item.moderationEvents : [];

    if (!events.length) {
      return `
        <section class="review-history" aria-label="Moderation history">
          <h4>Moderation History</h4>
          <p class="muted">No moderation history recorded yet.</p>
        </section>
      `;
    }

    return `
      <section class="review-history" aria-label="Moderation history">
        <h4>Moderation History</h4>
        <ol>
          ${events.map((event) => `
            <li>
              <div>
                <strong>${U.escapeHtml(event.action || "reviewed")}</strong>
                <span>${U.escapeHtml(formatDate(event.createdAt))}</span>
              </div>
              <p class="muted">${U.escapeHtml(moderatorName(event))}${event.reason ? ` · ${U.escapeHtml(event.reason)}` : ""}</p>
            </li>
          `).join("")}
        </ol>
      </section>
    `;
  }

  function renderPendingActions() {
    return `
      <label class="form-field review-reason">
        <span>Decline reason</span>
        <textarea data-reason maxlength="500" rows="3" placeholder="Required when declining."></textarea>
      </label>
      <div class="auth-actions">
        <button class="hero-cta hero-cta--primary" type="button" data-action="approved">Approve</button>
        <button class="hero-cta" type="button" data-action="rejected">Decline</button>
      </div>
    `;
  }

  function renderSubmission(item) {
    const title = item.title || item.originalFilename || "Untitled image";
    const caption = item.caption || "";
    const status = normalizeStatus(item.status || activeStatus);
    const rejectedReason = status === "rejected" && item.rejectionReason
      ? `<p class="review-decision">Reason: ${U.escapeHtml(item.rejectionReason)}</p>`
      : "";

    return `
      <article class="review-item review-item--${U.escapeHtml(status)}" data-submission-id="${U.escapeHtml(item.id || "")}">
        <div class="review-preview">
          ${renderPreview(item, title)}
        </div>
        <div class="review-details">
          <div class="review-details__head">
            <div>
              <h3>${U.escapeHtml(title)}</h3>
              <p class="muted">${U.escapeHtml(uploaderName(item))} · ${U.escapeHtml(discordDetail(item))}</p>
            </div>
            <span class="submission-status submission-status--${U.escapeHtml(status)}">${U.escapeHtml(status)}</span>
          </div>
          ${caption ? `<p>${U.escapeHtml(caption)}</p>` : ""}
          ${rejectedReason}
          ${renderMeta(item)}
          <details class="review-storage">
            <summary>Storage reference</summary>
            <code>${U.escapeHtml(item.storagePath || "Not available")}</code>
            ${item.discord?.messageId ? `<code>Discord message: ${U.escapeHtml(item.discord.messageId)}</code>` : ""}
          </details>
          ${renderHistory(item)}
          ${status === "pending" ? renderPendingActions() : ""}
        </div>
      </article>
    `;
  }

  function renderInstagramJob(job) {
    const submission = job.submission || {};
    const title = submission.title || submission.originalFilename || "Untitled image";
    const status = U.text(job.status, "queued").toLowerCase();
    const sourceLabel = U.text(submission.source, "website").toLowerCase() === "discord" ? "Discord" : "Website";
    const canPublish = status === "queued" || status === "failed";
    const canShareManually = status === "queued";
    const permalink = U.text(job.instagramPermalink, "");

    return `
      <article class="review-item review-item--${U.escapeHtml(status)}" data-instagram-job-id="${U.escapeHtml(job.id || "")}">
        <div class="review-preview">
          ${renderPreview(job, `${title} Instagram`)}
        </div>
        <div class="review-details">
          <div class="review-details__head">
            <div>
              <h3>${U.escapeHtml(title)}</h3>
              <p class="muted">${U.escapeHtml(submission.uploader?.displayName || "Mochirii Member")} - ${U.escapeHtml(sourceLabel)}</p>
            </div>
            <span class="submission-status submission-status--${U.escapeHtml(status)}">${U.escapeHtml(status)}</span>
          </div>
          ${job.eligibilityReason ? `<p class="review-decision">Eligibility: ${U.escapeHtml(job.eligibilityReason)}</p>` : ""}
          ${job.lastError ? `<p class="review-decision">Last error: ${U.escapeHtml(job.lastError)}</p>` : ""}
          ${permalink ? `<p><a href="${U.escapeHtml(permalink)}" target="_blank" rel="noopener noreferrer">Open Instagram post</a></p>` : ""}
          <dl class="review-meta">
            ${[
              ["Consent", submission.instagramOptIn ? "Instagram opt-in" : "No opt-in"],
              ["Consent source", submission.instagramOptInSource || "Not set"],
              ["Type", submission.mimeType || "Unknown"],
              ["Size", formatBytes(submission.sizeBytes)],
              ["Attempts", String(job.attemptCount || 0)],
              ["Queued", formatDate(job.createdAt)],
              ["Completed", job.publishedAt ? formatDate(job.publishedAt) : "Not completed"],
            ].map(([label, value]) => `
              <div>
                <dt>${U.escapeHtml(label)}</dt>
                <dd>${U.escapeHtml(value)}</dd>
              </div>
            `).join("")}
          </dl>
          <label class="form-field review-reason">
            <span>Instagram caption</span>
            <textarea data-instagram-caption maxlength="2200" rows="4" ${canPublish ? "" : "disabled"}>${U.escapeHtml(job.caption || "")}</textarea>
          </label>
          <label class="form-field review-reason">
            <span>Instagram alt text</span>
            <textarea data-instagram-alt-text maxlength="1000" rows="3" ${canPublish ? "" : "disabled"}>${U.escapeHtml(job.altText || "")}</textarea>
          </label>
          <label class="form-field review-reason">
            <span>Instagram permalink after manual post</span>
            <input data-instagram-permalink type="url" maxlength="500" placeholder="https://www.instagram.com/p/..." value="${U.escapeHtml(permalink)}" ${canShareManually ? "" : "disabled"}>
          </label>
          <label class="form-field review-reason">
            <span>Manual share note</span>
            <textarea data-instagram-note maxlength="500" rows="2" placeholder="Optional moderator note." ${canShareManually ? "" : "disabled"}></textarea>
          </label>
          <div class="auth-actions">
            ${job.signedPreviewUrl ? `<a class="hero-cta" href="${U.escapeHtml(job.signedPreviewUrl)}" download target="_blank" rel="noopener noreferrer">Download image</a>` : `<button class="hero-cta" type="button" disabled>Download image</button>`}
            <button class="hero-cta" type="button" data-instagram-action="copy-caption" ${job.caption ? "" : "disabled"}>Copy caption</button>
            <button class="hero-cta" type="button" data-instagram-action="copy-alt" ${job.altText ? "" : "disabled"}>Copy alt text</button>
            <button class="hero-cta hero-cta--primary" type="button" data-instagram-action="mark-shared" ${canShareManually ? "" : "disabled"}>Mark shared manually</button>
            <button class="hero-cta" type="button" data-instagram-action="publish" disabled>Meta API unavailable</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderMemberVerificationResult(userId, verification) {
    const result = $("#memberVerificationResult");
    if (!result) return;
    if (!verification) {
      result.innerHTML = "";
      return;
    }

    const status = U.text(verification.status, "pending").toLowerCase();
    const rows = [
      ["User", userId || "Not set"],
      ["Status", status],
      ["Method", memberVerificationMethodLabel(verification.method)],
      ["Reviewed", verification.reviewedAt ? formatDate(verification.reviewedAt) : "Not set"],
      ["Verified", verification.verifiedAt ? formatDate(verification.verifiedAt) : "Not set"],
      ["Expires", verification.expiresAt ? formatDate(verification.expiresAt) : "No expiry"],
      ["Note", verification.reason || "No note recorded"],
    ];

    result.innerHTML = `
      <dl class="review-meta" aria-label="Last member verification review">
        ${rows.map(([label, value]) => `
          <div>
            <dt>${U.escapeHtml(label)}</dt>
            <dd>${U.escapeHtml(value)}</dd>
          </div>
        `).join("")}
      </dl>
    `;
  }

  async function loadQueue({ status = activeStatus, successMessage = "" } = {}) {
    if (!accessReady) return;

    activeStatus = normalizeStatus(status);
    const config = statusConfig(activeStatus);

    setBusy(true);
    setError("#reviewError", "");
    setText("#reviewStatus", `Loading ${config.label.toLowerCase()} submissions.`);

    const list = $("#reviewList");
    if (list) list.innerHTML = "";

    const result = await S.listGalleryReviewQueue({ status: activeStatus });
    if (!result.ok) {
      setError("#reviewError", result.message || "Gallery moderation submissions could not be loaded.");
      setText("#reviewStatus", "");
      setBusy(false);
      return;
    }

    const data = result.data || {};
    const submissions = Array.isArray(data.submissions) ? data.submissions : [];
    latestSummary = data.summary || latestSummary || {};

    renderQueueTabs(latestSummary);
    renderSummary(latestSummary, submissions.length);

    if (!submissions.length) {
      if (list) list.innerHTML = `<p class="muted">${U.escapeHtml(config.empty)}</p>`;
      setText("#reviewStatus", successMessage || config.empty);
      setBusy(false);
      return;
    }

    if (list) list.innerHTML = submissions.map(renderSubmission).join("");
    setText(
      "#reviewStatus",
      successMessage || `${submissions.length} ${config.label.toLowerCase()} submission${submissions.length === 1 ? "" : "s"} shown.`,
    );
    setBusy(false);
  }

  async function loadInstagramQueue({ status = activeInstagramStatus, successMessage = "" } = {}) {
    if (!accessReady) return;

    activeInstagramStatus = normalizeInstagramStatus(status);
    const config = instagramStatusConfig(activeInstagramStatus);

    setBusy(true);
    setError("#instagramError", "");
    setText("#instagramStatus", `Loading ${config.label.toLowerCase()} Instagram jobs.`);

    const list = $("#instagramList");
    if (list) list.innerHTML = "";

    const requestedStatus = activeInstagramStatus === "shared_manually" ? "all" : activeInstagramStatus;
    const result = await S.listInstagramPublishQueue({ status: requestedStatus });
    if (!result.ok) {
      setError("#instagramError", result.message || "Instagram publishing queue could not be loaded.");
      setText("#instagramStatus", "");
      setBusy(false);
      return;
    }

    const data = result.data || {};
    const responseJobs = Array.isArray(data.jobs) ? data.jobs : [];
    const jobs = activeInstagramStatus === "shared_manually"
      ? responseJobs.filter((job) => U.text(job.status) === "shared_manually")
      : responseJobs;
    data.jobs = jobs;
    data.count = jobs.length;
    if (activeInstagramStatus === "shared_manually") {
      data.summary = { ...(data.summary || {}), shared_manually: jobs.length };
    }
    latestInstagramSummary = data.summary || latestInstagramSummary || {};

    renderInstagramQueueTabs(latestInstagramSummary);

    if (!jobs.length) {
      if (list) list.innerHTML = `<p class="muted">${U.escapeHtml(config.empty)}</p>`;
      setText("#instagramStatus", successMessage || config.empty);
      setBusy(false);
      return;
    }

    if (list) list.innerHTML = jobs.map(renderInstagramJob).join("");
    setText(
      "#instagramStatus",
      successMessage || `${jobs.length} ${config.label.toLowerCase()} Instagram job${jobs.length === 1 ? "" : "s"} shown.`,
    );
    setBusy(false);
  }

  async function checkAccess() {
    setBusy(true);
    setError("#reviewError", "");
    setText("#reviewStatus", "Checking moderator access.");
    accessReady = false;

    const auth = await S.requireAuth();
    if (!auth.ok) {
      showPanel("#signedOutPanel");
      setBusy(false);
      return;
    }

    const access = await S.checkLeaderGalleryModerationAccess();
    if (!access.ok) {
      $("#accessDeniedMessage").textContent =
        access.message || "Gallery moderation requires Discord membership, completed onboarding, and the Moderator role.";
      showPanel("#accessDeniedPanel");
      setBusy(false);
      return;
    }

    accessReady = true;
    showPanel("#reviewPanel");
    await loadQueue({ status: activeStatus });
    await loadInstagramQueue({ status: activeInstagramStatus });
  }

  async function moderate(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("[data-action]");
    if (!button) return;

    const card = button.closest("[data-submission-id]");
    const submissionId = card?.dataset?.submissionId || "";
    const action = button.dataset.action;
    const reasonField = card?.querySelector("[data-reason]");
    const reason = reasonField?.value?.trim() || "";

    if (action === "rejected" && reason.length < 2) {
      setError("#reviewError", "Add a decline reason before rejecting this submission.");
      reasonField?.focus();
      return;
    }

    setBusy(true);
    setError("#reviewError", "");
    setText("#reviewStatus", action === "approved" ? "Approving submission." : "Declining submission.");

    const result = await S.moderateGallerySubmission(submissionId, action, reason);
    if (!result.ok) {
      setError("#reviewError", result.message || "The submission could not be moderated.");
      setText("#reviewStatus", "");
      setBusy(false);
      return;
    }

    await loadQueue({
      status: activeStatus,
      successMessage: result.message || "Submission moderated.",
    });
    if (action === "approved") {
      await loadInstagramQueue({ status: activeInstagramStatus });
    }
  }

  async function reviewMemberVerification(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("[data-member-verification-action]");
    if (!button || !accessReady) return;

    const action = button.dataset.memberVerificationAction || "";
    const userId = U.text($("#memberVerificationUserId")?.value, "");
    const method = U.text($("#memberVerificationMethod")?.value, "manual_review");
    const expiresAt = U.text($("#memberVerificationExpiresAt")?.value, "");
    const reason = U.text($("#memberVerificationReason")?.value, "");

    if (!UUID_RE.test(userId)) {
      setError("#memberVerificationError", "Enter a valid Supabase user id before reviewing member verification.");
      $("#memberVerificationUserId")?.focus();
      return;
    }

    if ((action === "reject" || action === "revoke") && reason.length < 2) {
      setError("#memberVerificationError", "Add a redacted note before rejecting or revoking member verification.");
      $("#memberVerificationReason")?.focus();
      return;
    }

    setBusy(true);
    setError("#memberVerificationError", "");
    setText(
      "#memberVerificationStatus",
      action === "approve"
        ? "Approving member verification."
        : action === "reject"
          ? "Rejecting member verification."
          : "Revoking member verification.",
    );

    const result = await S.reviewMemberVerification({
      userId,
      action,
      method,
      reason,
      expiresAt,
    });

    if (!result.ok) {
      setError("#memberVerificationError", result.message || "Member verification review could not be saved.");
      setText("#memberVerificationStatus", "");
      setBusy(false);
      return;
    }

    renderMemberVerificationResult(result.data?.userId || userId, result.data?.verification || null);
    setText("#memberVerificationStatus", result.message || "Member verification review saved.");
    setBusy(false);
  }

  function selectQueueStatus(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("[data-status]");
    if (!button || !accessReady) return;
    loadQueue({ status: button.dataset.status });
  }

  function selectInstagramStatus(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("[data-instagram-status]");
    if (!button || !accessReady) return;
    loadInstagramQueue({ status: button.dataset.instagramStatus });
  }

  async function publishInstagram(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("[data-instagram-action='publish']");
    if (!button || !accessReady) return;

    const card = button.closest("[data-instagram-job-id]");
    const jobId = card?.dataset?.instagramJobId || "";
    const caption = card?.querySelector("[data-instagram-caption]")?.value?.trim() || "";
    const altText = card?.querySelector("[data-instagram-alt-text]")?.value?.trim() || "";

    const confirmed = window.confirm("Publish this approved member image to the official Mōchirīī Instagram account?");
    if (!confirmed) return;

    setBusy(true);
    setError("#instagramError", "");
    setText("#instagramStatus", "Publishing image to Instagram.");

    const result = await S.publishInstagramGallerySubmission({
      jobId,
      caption,
      altText,
      confirmPublish: true,
    });

    if (!result.ok) {
      setError("#instagramError", result.message || "Instagram publishing failed.");
      setText("#instagramStatus", "");
      setBusy(false);
      await loadInstagramQueue({ status: activeInstagramStatus });
      return;
    }

    await loadInstagramQueue({
      status: activeInstagramStatus,
      successMessage: result.message || "Image published to Instagram.",
    });
  }

  async function copyInstagramText(value, label) {
    const clean = U.text(value, "");
    if (!clean) {
      setError("#instagramError", `${label} is empty.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(clean);
      setError("#instagramError", "");
      setText("#instagramStatus", `${label} copied.`);
    } catch {
      setError("#instagramError", `${label} could not be copied by this browser.`);
    }
  }

  async function handleInstagramAction(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("[data-instagram-action]");
    if (!button || !accessReady) return;

    const action = button.dataset.instagramAction;
    if (action === "publish") {
      await publishInstagram(event);
      return;
    }

    const card = button.closest("[data-instagram-job-id]");
    const jobId = card?.dataset?.instagramJobId || "";
    const caption = card?.querySelector("[data-instagram-caption]")?.value?.trim() || "";
    const altText = card?.querySelector("[data-instagram-alt-text]")?.value?.trim() || "";
    const instagramPermalink = card?.querySelector("[data-instagram-permalink]")?.value?.trim() || "";
    const moderatorNote = card?.querySelector("[data-instagram-note]")?.value?.trim() || "";

    if (action === "copy-caption") {
      await copyInstagramText(caption, "Instagram caption");
      return;
    }

    if (action === "copy-alt") {
      await copyInstagramText(altText, "Instagram alt text");
      return;
    }

    if (action !== "mark-shared") return;

    const confirmed = window.confirm("Mark this Instagram queue item as shared manually after posting from the official account?");
    if (!confirmed) return;

    setBusy(true);
    setError("#instagramError", "");
    setText("#instagramStatus", "Marking Instagram job as shared manually.");

    const result = await S.markInstagramGallerySubmissionShared({
      jobId,
      instagramPermalink,
      moderatorNote,
      confirmManualShare: true,
    });

    if (!result.ok) {
      setError("#instagramError", result.message || "Instagram job could not be marked shared manually.");
      setText("#instagramStatus", "");
      setBusy(false);
      await loadInstagramQueue({ status: activeInstagramStatus });
      return;
    }

    await loadInstagramQueue({
      status: activeInstagramStatus,
      successMessage: result.message || "Instagram job marked as shared manually.",
    });
  }

  function boot() {
    $("#refreshQueue")?.addEventListener("click", () => loadQueue({ status: activeStatus }));
    $("#refreshInstagramQueue")?.addEventListener("click", () => loadInstagramQueue({ status: activeInstagramStatus }));
    $("#queueTabs")?.addEventListener("click", selectQueueStatus);
    $("#instagramQueueTabs")?.addEventListener("click", selectInstagramStatus);
    $("#reviewList")?.addEventListener("click", moderate);
    $("#memberVerificationPanel")?.addEventListener("click", reviewMemberVerification);
    $("#instagramList")?.addEventListener("click", handleInstagramAction);
    renderQueueTabs(latestSummary);
    renderInstagramQueueTabs(latestInstagramSummary);
    S.onAuthStateChange(() => {
      checkAccess();
    });
    checkAccess();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
