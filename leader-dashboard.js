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
    { id: "all", label: "All", empty: "No Instagram publishing jobs." },
  ];
  const INSTAGRAM_STATUS_IDS = new Set(INSTAGRAM_STATUSES.map((status) => status.id));

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
    $("#instagramList")?.querySelectorAll("button, textarea").forEach((el) => {
      el.disabled = busy;
    });
  }

  function showPanel(panelId) {
    const reviewMode = panelId === "#reviewPanel";
    ["#signedOutPanel", "#accessDeniedPanel", "#reviewPanel", "#instagramQueuePanel"].forEach((selector) => {
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
              ["Type", submission.mimeType || "Unknown"],
              ["Size", formatBytes(submission.sizeBytes)],
              ["Attempts", String(job.attemptCount || 0)],
              ["Queued", formatDate(job.createdAt)],
              ["Published", job.publishedAt ? formatDate(job.publishedAt) : "Not published"],
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
          <div class="auth-actions">
            <button class="hero-cta hero-cta--primary" type="button" data-instagram-action="publish" ${canPublish ? "" : "disabled"}>Publish to Instagram</button>
          </div>
        </div>
      </article>
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

    const result = await S.listInstagramPublishQueue({ status: activeInstagramStatus });
    if (!result.ok) {
      setError("#instagramError", result.message || "Instagram publishing queue could not be loaded.");
      setText("#instagramStatus", "");
      setBusy(false);
      return;
    }

    const data = result.data || {};
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
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

  function boot() {
    $("#refreshQueue")?.addEventListener("click", () => loadQueue({ status: activeStatus }));
    $("#refreshInstagramQueue")?.addEventListener("click", () => loadInstagramQueue({ status: activeInstagramStatus }));
    $("#queueTabs")?.addEventListener("click", selectQueueStatus);
    $("#instagramQueueTabs")?.addEventListener("click", selectInstagramStatus);
    $("#reviewList")?.addEventListener("click", moderate);
    $("#instagramList")?.addEventListener("click", publishInstagram);
    renderQueueTabs(latestSummary);
    renderInstagramQueueTabs(latestInstagramSummary);
    S.onAuthStateChange(() => {
      checkAccess();
    });
    checkAccess();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
