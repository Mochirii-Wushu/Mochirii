/* gallery-submit.js - member-verified pending gallery uploads */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "gallery-submit") return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const S = window.MochiriiSupabase;
  const U = window.MochiriiUtils;

  let accessState = null;

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
    $("#refreshVerification")?.toggleAttribute("disabled", busy);
    $("#uploadForm")?.querySelectorAll("input, textarea, select, button").forEach((el) => {
      el.disabled = busy;
    });
  }

  function hasRecentVerification(profile) {
    const config = S.getConfig();
    const time = new Date(profile?.discord_verified_at || 0).getTime();
    return Number.isFinite(time) && Date.now() - time <= config.recentVerificationMs;
  }

  function activeVerified(profile) {
    return Boolean(
      profile?.member_status === "active" &&
        profile?.has_required_discord_roles === true &&
        hasRecentVerification(profile),
    );
  }

  function activeMemberAccess(profile, accessState) {
    return Boolean(activeVerified(profile) || (profile?.member_status === "active" && accessState?.galleryEligible === true));
  }

  function renderGate(mode, message) {
    const allowed = mode === "allowed";
    $("#uploadPanel").hidden = !allowed;
    $("#uploadGate").hidden = allowed;
    $("#uploadLoginLink").hidden = mode !== "signed-out";
    $("#refreshVerification").hidden = mode !== "needs-verification";
    $("#uploadAccountLink").hidden = mode === "signed-out" || allowed;

    setText("#uploadGateState", mode === "signed-out" ? "Signed out" : mode === "allowed" ? "Ready" : "Needs review");
    setText("#uploadGateTitle", mode === "signed-out" ? "Login Required" : mode === "allowed" ? "Upload Ready" : "Member Verification Required");
    setText("#uploadGateMessage", message);
  }

  function metadataFromForm(form) {
    const data = new FormData(form);
    return {
      title: data.get("title") || "",
      caption: data.get("caption") || "",
      category: data.get("category") || "",
      instagramOptIn: data.get("instagramOptIn") === "true",
    };
  }

  function fileFromForm(form) {
    const input = form.querySelector("#imageFile");
    return input?.files?.[0] || null;
  }

  function statusBadge(status) {
    const value = U.text(status, "pending");
    return `<span class="submission-status submission-status--${U.escapeHtml(value)}">${U.escapeHtml(value)}</span>`;
  }

  function renderSubmission(item) {
    const created = item.created_at ? new Date(item.created_at).toLocaleDateString() : "Unknown date";
    const title = U.escapeHtml(item.title || item.original_filename || "Untitled image");
    const caption = item.caption ? `<p>${U.escapeHtml(item.caption)}</p>` : "";
    const category = item.category ? `<span>${U.escapeHtml(item.category)}</span>` : "";
    const instagramLabel = item.instagram_opt_in === true ? "Instagram opt-in" : "Site Gallery only";

    return `
      <article class="submission-item">
        <div class="submission-item__head">
          <h3>${title}</h3>
          ${statusBadge(item.status)}
        </div>
        ${caption}
        <div class="submission-meta">
          <span>${U.escapeHtml(created)}</span>
          ${category}
          <span>${U.escapeHtml(instagramLabel)}</span>
        </div>
      </article>
    `;
  }

  async function loadSubmissions() {
    setError("#submissionsError", "");
    const list = $("#submissionsList");
    if (list) list.innerHTML = '<p class="muted">Loading submissions.</p>';

    const result = await S.listMyGallerySubmissions();
    if (!result.ok) {
      if (list) list.innerHTML = "";
      setError("#submissionsError", result.message || "Submissions could not be loaded.");
      return;
    }

    const submissions = Array.isArray(result.data) ? result.data : [];
    if (!submissions.length) {
      if (list) list.innerHTML = '<p class="muted">No submissions yet.</p>';
      return;
    }

    if (list) list.innerHTML = submissions.map(renderSubmission).join("");
  }

  async function checkAccess({ refresh = false } = {}) {
    setBusy(true);
    setError("#uploadError", "");
    setText("#uploadStatus", "");

    const auth = await S.requireAuth();
    if (!auth.ok) {
      accessState = null;
      renderGate("signed-out", "Choose a sign-in method before submitting images.");
      setBusy(false);
      return;
    }

    const verification = await S.verifyMemberAccess({ refreshDiscord: refresh === true });
    if (!verification.ok) {
      setError("#uploadError", verification.message || "Member verification could not be checked.");
    }

    const profileResult = await S.getCurrentProfile();
    const profile = verification.data?.profile || profileResult.data;
    accessState = { user: auth.data.user, profile, verification: verification.data };

    if (!profileResult.ok || !activeMemberAccess(profile, verification.data)) {
      renderGate(
        "needs-verification",
        verification.data?.message || "Gallery upload access requires Discord verification or moderator-approved member verification.",
      );
      setBusy(false);
      return;
    }

    renderGate("allowed", "Upload access verified.");
    await loadSubmissions();
    setBusy(false);
  }

  async function submitImage(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileFromForm(form);

    setBusy(true);
    setError("#uploadError", "");
    setText("#uploadStatus", "Submitting image for moderation.");

    if (!activeMemberAccess(accessState?.profile, accessState?.verification)) {
      await checkAccess({ refresh: true });
      if (!activeMemberAccess(accessState?.profile, accessState?.verification)) {
        setError("#uploadError", "Member verification and active member status are required before upload.");
        setText("#uploadStatus", "");
        setBusy(false);
        return;
      }
    }

    const result = await S.uploadMemberGalleryImage(file, metadataFromForm(form));
    if (!result.ok) {
      setError("#uploadError", result.message || "Upload failed.");
      setText("#uploadStatus", "");
      setBusy(false);
      return;
    }

    const successMessage =
      "Image submitted for moderation. It will not appear in the public Gallery until Moderator approval.";
    form.reset();
    await checkAccess();
    await loadSubmissions();
    setText("#uploadStatus", successMessage);
    setBusy(false);
  }

  function boot() {
    $("#refreshVerification")?.addEventListener("click", () => checkAccess({ refresh: true }));
    $("#uploadForm")?.addEventListener("submit", submitImage);
    S.onAuthStateChange(() => {
      checkAccess();
    });
    checkAccess();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
