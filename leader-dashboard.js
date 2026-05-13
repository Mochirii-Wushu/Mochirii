/* leader-dashboard.js - moderator-only pending gallery review UI */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "leader-dashboard") return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const S = window.MochiriiSupabase;
  const U = window.MochiriiUtils;

  let accessReady = false;

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
    $("#reviewList")?.querySelectorAll("button, textarea").forEach((el) => {
      el.disabled = busy;
    });
  }

  function showPanel(panelId) {
    ["#signedOutPanel", "#accessDeniedPanel", "#reviewPanel"].forEach((selector) => {
      const el = $(selector);
      if (el) el.hidden = selector !== panelId;
    });
  }

  function formatDate(value) {
    if (!value) return "Unknown date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
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

  function renderSubmission(item) {
    const title = item.title || item.originalFilename || "Untitled image";
    const caption = item.caption || "";
    const category = item.category || "Uncategorized";
    const uploader = item.uploader || {};
    const discordDetail = uploader.discordUsername || uploader.discordUserId || "Discord identity on file";

    return `
      <article class="review-item" data-submission-id="${U.escapeHtml(item.id)}">
        <div class="review-preview">
          <img src="${U.escapeHtml(item.signedPreviewUrl)}" alt="${U.escapeHtml(title)} preview" loading="lazy" decoding="async" />
        </div>
        <div class="review-details">
          <div class="review-details__head">
            <div>
              <h3>${U.escapeHtml(title)}</h3>
              <p class="muted">${U.escapeHtml(uploaderName(item))} · ${U.escapeHtml(discordDetail)}</p>
            </div>
            <span class="submission-status submission-status--pending">pending</span>
          </div>
          ${caption ? `<p>${U.escapeHtml(caption)}</p>` : ""}
          <dl class="review-meta">
            <div>
              <dt>Category</dt>
              <dd>${U.escapeHtml(category)}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>${U.escapeHtml(item.mimeType || "Unknown")}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>${U.escapeHtml(formatBytes(item.sizeBytes))}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>${U.escapeHtml(formatDate(item.createdAt))}</dd>
            </div>
          </dl>
          <label class="form-field review-reason">
            <span>Decline reason</span>
            <textarea data-reason maxlength="500" rows="3"></textarea>
          </label>
          <div class="auth-actions">
            <button class="hero-cta hero-cta--primary" type="button" data-action="approved">Approve</button>
            <button class="hero-cta" type="button" data-action="rejected">Decline</button>
          </div>
        </div>
      </article>
    `;
  }

  async function loadQueue() {
    if (!accessReady) return;

    setBusy(true);
    setError("#reviewError", "");
    setText("#reviewStatus", "Loading pending submissions.");

    const list = $("#reviewList");
    if (list) list.innerHTML = "";

    const result = await S.listGalleryReviewQueue();
    if (!result.ok) {
      setError("#reviewError", result.message || "Pending submissions could not be loaded.");
      setText("#reviewStatus", "");
      setBusy(false);
      return;
    }

    const submissions = Array.isArray(result.data?.submissions) ? result.data.submissions : [];
    if (!submissions.length) {
      if (list) list.innerHTML = '<p class="muted">No pending gallery submissions.</p>';
      setText("#reviewStatus", "No pending gallery submissions.");
      setBusy(false);
      return;
    }

    if (list) list.innerHTML = submissions.map(renderSubmission).join("");
    setText("#reviewStatus", `${submissions.length} pending submission${submissions.length === 1 ? "" : "s"} ready for review.`);
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
    await loadQueue();
  }

  async function moderate(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const card = button.closest("[data-submission-id]");
    const submissionId = card?.dataset?.submissionId || "";
    const action = button.dataset.action;
    const reason = card?.querySelector("[data-reason]")?.value || "";

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

    card?.remove();
    const list = $("#reviewList");
    if (list && !list.querySelector("[data-submission-id]")) {
      list.innerHTML = '<p class="muted">No pending gallery submissions.</p>';
    }
    setText("#reviewStatus", result.message || "Submission moderated.");
    setBusy(false);
  }

  function boot() {
    $("#refreshQueue")?.addEventListener("click", loadQueue);
    $("#reviewList")?.addEventListener("click", moderate);
    S.onAuthStateChange(() => {
      checkAccess();
    });
    checkAccess();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
