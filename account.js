/* account.js - member profile, verification, and gallery summary UI */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "account") return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const S = window.MochiriiSupabase;
  const U = window.MochiriiUtils;
  const EDITABLE_FIELDS = ["display_name", "game_uid", "discord_handle", "region", "timezone", "avatar_url", "bio"];
  const CORE_PROFILE_FIELDS = [
    ["display_name", "Display name"],
    ["game_uid", "Game UID"],
    ["discord_handle", "Discord handle"],
    ["region", "Region"],
    ["timezone", "Timezone"],
  ];
  const OPTIONAL_PROFILE_FIELDS = [
    ["avatar_url", "Avatar URL"],
    ["bio", "Bio"],
  ];
  const SUBMISSION_STATUSES = ["pending", "approved", "rejected", "archived"];
  const PILL_CLASSES = [
    "status-pill--active",
    "status-pill--pending",
    "status-pill--warning",
    "status-pill--danger",
    "status-pill--muted",
  ];

  let currentUser = null;
  let currentProfile = null;

  function setText(selector, value, fallback = "Not set") {
    const el = $(selector);
    if (el) el.textContent = U.text(value, fallback);
  }

  function setError(selector, message) {
    const el = $(selector);
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
  }

  function setBusy(busy) {
    $("#verifyButton")?.toggleAttribute("disabled", busy);
    $("#signOutButton")?.toggleAttribute("disabled", busy);
    $("#profileForm")?.querySelectorAll("input, textarea, button").forEach((el) => {
      el.disabled = busy;
    });
  }

  function setPill(selector, value, tone = "muted") {
    const el = $(selector);
    if (!el) return;
    el.classList.remove(...PILL_CLASSES);
    el.classList.add(`status-pill--${tone}`);
    el.textContent = U.text(value, "Not set");
  }

  function formatDate(value) {
    if (!value) return "Not checked";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not checked";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateShort(value) {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function signedInName(user, profile) {
    return (
      profile?.discord_global_name ||
      profile?.discord_username ||
      user?.user_metadata?.global_name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      "Discord user"
    );
  }

  function displayName(profile) {
    return profile?.display_name || signedInName(currentUser, profile);
  }

  function hasRecentVerification(profile) {
    const config = S.getConfig();
    const time = new Date(profile?.discord_verified_at || 0).getTime();
    return Number.isFinite(time) && Date.now() - time <= config.recentVerificationMs;
  }

  function prettyStatus(status) {
    const value = U.text(status, "pending").toLowerCase();
    return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
  }

  function profileCompletion(profile) {
    const missing = CORE_PROFILE_FIELDS
      .filter(([field]) => !U.text(profile?.[field], ""))
      .map(([, label]) => label);
    const optionalComplete = OPTIONAL_PROFILE_FIELDS.filter(([field]) => U.text(profile?.[field], "")).length;
    const complete = CORE_PROFILE_FIELDS.length - missing.length;
    const percent = Math.round((complete / CORE_PROFILE_FIELDS.length) * 100);

    return {
      complete,
      total: CORE_PROFILE_FIELDS.length,
      percent,
      missing,
      optionalComplete,
    };
  }

  function uploadAccess(profile) {
    const config = S.getConfig();
    const status = U.text(profile?.member_status, "pending").toLowerCase();
    const hasRoles = profile?.has_required_discord_roles === true;
    const recent = hasRecentVerification(profile);
    const roleNames = config.requiredRoleNames || ["Mochirii role", "Verified"];

    if (status === "suspended" || status === "archived") {
      return {
        ok: false,
        label: prettyStatus(status),
        tone: "danger",
        next: "Contact leadership if this status looks wrong.",
        guidance: "Gallery upload access is unavailable for this member status.",
      };
    }

    if (!hasRoles) {
      return {
        ok: false,
        label: "Missing required roles",
        tone: "warning",
        next: "Complete Discord onboarding, then ask leadership for the required roles.",
        guidance: `Upload access needs both Discord roles: ${roleNames.join(" and ")}.`,
      };
    }

    if (!recent) {
      return {
        ok: false,
        label: "Verification expired",
        tone: "warning",
        next: "Run Check Verification to refresh your Discord role status.",
        guidance: "Your required roles were found before, but the website needs a recent Discord check before upload.",
      };
    }

    if (status !== "active") {
      return {
        ok: false,
        label: `${prettyStatus(status)} member status`,
        tone: "pending",
        next: "Wait for leadership to activate the website member profile.",
        guidance: "Discord roles are verified, but upload access also needs active website member status.",
      };
    }

    return {
      ok: true,
      label: "Ready to upload",
      tone: "active",
      next: "Submit an image or review your gallery submission history.",
      guidance: "Gallery upload access is available.",
    };
  }

  function renderProfileForm(profile) {
    EDITABLE_FIELDS.forEach((field) => {
      const input = $(`#${field}`);
      if (input) input.value = profile?.[field] || "";
    });
  }

  function renderProfileCompletion(profile) {
    const completion = profileCompletion(profile);
    const bar = $("#profileCompletionBar");
    const missingList = $("#profileMissingList");
    const summary = `${completion.complete} / ${completion.total} core fields complete`;
    const details = `${summary}. Optional fields complete: ${completion.optionalComplete} / ${OPTIONAL_PROFILE_FIELDS.length}.`;

    setText("#overviewProfileCompletion", summary);
    setText("#profileCompletionText", details, "");

    if (bar) bar.style.width = `${completion.percent}%`;

    if (!missingList) return;
    if (!completion.missing.length) {
      missingList.innerHTML = '<li>Core profile fields are complete.</li>';
      return;
    }

    missingList.innerHTML = completion.missing
      .map((label) => `<li>${U.escapeHtml(label)} recommended.</li>`)
      .join("");
  }

  function renderStatus() {
    const profile = currentProfile || {};
    const status = U.text(profile.member_status, "pending").toLowerCase();
    const hasRoles = profile.has_required_discord_roles === true;
    const recent = hasRecentVerification(profile);
    const access = uploadAccess(profile);

    setPill("#memberStatus", access.ok ? "Active" : prettyStatus(status), access.ok ? "active" : access.tone);
    setText("#overviewDisplayName", displayName(profile));
    setText("#discordIdentity", signedInName(currentUser, profile));
    setText("#overviewMemberStatus", prettyStatus(status));
    setText("#uploadEligibility", access.label);
    setText("#lastChecked", formatDate(profile.discord_checked_at));
    setText("#discordVerification", recent ? "Recently verified" : hasRoles ? "Verification expired" : "Needs verification");
    setText("#requiredRoles", hasRoles ? "Both required roles verified" : "Required roles not verified");
    setText("#nextStep", access.next);
    setText("#uploadGuidance", access.guidance, "");
    setText("#verifyStatus", access.guidance, "");
    renderProfileCompletion(profile);

    $("#submitLink").hidden = !access.ok;
  }

  async function renderLeaderDashboardLink() {
    const link = $("#leaderDashboardLink");
    if (!link) return false;

    link.hidden = true;
    setText("#moderatorAccess", "Checking", "");
    const access = await S.checkLeaderGalleryModerationAccess();
    const allowed = access.ok === true;
    link.hidden = !allowed;
    setText("#moderatorAccess", allowed ? "Moderator access available" : "Not available");
    return allowed;
  }

  function statusBadge(status) {
    const value = U.text(status, "pending").toLowerCase();
    const safe = U.escapeHtml(value);
    return `<span class="submission-status submission-status--${safe}">${safe}</span>`;
  }

  function countSubmissions(submissions) {
    const counts = SUBMISSION_STATUSES.reduce((memo, status) => {
      memo[status] = 0;
      return memo;
    }, { total: submissions.length });

    submissions.forEach((submission) => {
      const status = U.text(submission.status, "pending").toLowerCase();
      if (Object.hasOwn(counts, status)) counts[status] += 1;
    });

    return counts;
  }

  function renderSubmissionSummary(submissions) {
    const panel = $("#gallerySubmissionSummary");
    if (!panel) return;
    const counts = countSubmissions(submissions);
    const cards = [
      ["Total", counts.total],
      ["Pending", counts.pending],
      ["Approved", counts.approved],
      ["Rejected", counts.rejected],
      ["Archived", counts.archived],
    ];

    panel.innerHTML = cards.map(([label, value]) => `
      <div class="account-summary-card">
        <span>${U.escapeHtml(label)}</span>
        <strong>${U.escapeHtml(String(value || 0))}</strong>
      </div>
    `).join("");
  }

  function renderSubmission(item) {
    const title = U.escapeHtml(item.title || item.original_filename || "Untitled image");
    const caption = item.caption ? `<p>${U.escapeHtml(item.caption)}</p>` : "";
    const category = item.category ? `<span>${U.escapeHtml(item.category)}</span>` : "";
    const reviewed = item.reviewed_at ? `<span>Reviewed ${U.escapeHtml(formatDateShort(item.reviewed_at))}</span>` : "";
    const reason = item.rejection_reason
      ? `<p class="submission-reason">Reason: ${U.escapeHtml(item.rejection_reason)}</p>`
      : "";

    return `
      <article class="submission-item">
        <div class="submission-item__head">
          <h3>${title}</h3>
          ${statusBadge(item.status)}
        </div>
        ${caption}
        ${reason}
        <div class="submission-meta">
          <span>Submitted ${U.escapeHtml(formatDateShort(item.created_at))}</span>
          ${reviewed}
          ${category}
        </div>
      </article>
    `;
  }

  async function loadSubmissions() {
    const list = $("#accountSubmissionsList");
    const summary = $("#gallerySubmissionSummary");
    setError("#accountSubmissionsError", "");

    if (summary) summary.innerHTML = '<p class="muted">Loading submission summary.</p>';
    if (list) list.innerHTML = '<p class="muted">Loading recent submissions.</p>';

    const result = await S.listMyGallerySubmissions();
    if (!result.ok) {
      if (summary) summary.innerHTML = "";
      if (list) list.innerHTML = "";
      setError("#accountSubmissionsError", result.message || "Gallery submissions could not be loaded.");
      return;
    }

    const submissions = Array.isArray(result.data) ? result.data : [];
    renderSubmissionSummary(submissions);

    if (!submissions.length) {
      if (list) list.innerHTML = '<p class="muted">No gallery submissions yet.</p>';
      return;
    }

    if (list) list.innerHTML = submissions.slice(0, 5).map(renderSubmission).join("");
  }

  async function loadAccount() {
    setBusy(true);
    setError("#verifyError", "");
    setError("#profileError", "");
    setError("#accountSubmissionsError", "");
    setText("#profileStatus", "", "");

    const auth = await S.requireAuth();
    if (!auth.ok) {
      $("#signedOutPanel").hidden = false;
      $("#accountPanel").hidden = true;
      $("#leaderDashboardLink").hidden = true;
      setBusy(false);
      return;
    }

    currentUser = auth.data.user;
    $("#signedOutPanel").hidden = true;
    $("#accountPanel").hidden = false;

    const profileResult = await S.getCurrentProfile();
    if (profileResult.ok) {
      currentProfile = profileResult.data || {};
      renderProfileForm(currentProfile);
      renderStatus();
      await Promise.all([renderLeaderDashboardLink(), loadSubmissions()]);
    } else {
      setError("#verifyError", profileResult.message || "Profile could not be loaded.");
      const summary = $("#gallerySubmissionSummary");
      const list = $("#accountSubmissionsList");
      if (summary) summary.innerHTML = "";
      if (list) list.innerHTML = "";
    }

    setBusy(false);
  }

  async function verifyDiscord() {
    setBusy(true);
    setError("#verifyError", "");
    setText("#verifyStatus", "Checking Discord membership and required roles.", "");

    const result = await S.verifyDiscordMembership();
    if (!result.ok) {
      setError("#verifyError", result.message || "Discord verification failed.");
    } else {
      setText("#verifyStatus", result.data?.message || "Discord verification checked.", "");
    }

    await loadAccount();
  }

  function payloadFromForm(form) {
    const data = new FormData(form);
    return EDITABLE_FIELDS.reduce((payload, field) => {
      payload[field] = data.get(field) || "";
      return payload;
    }, {});
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("#profileError", "");
    setText("#profileStatus", "", "");

    let payload;
    try {
      payload = payloadFromForm(form);
    } catch (error) {
      setError("#profileError", error?.message || "Profile form could not be read.");
      return;
    }

    setBusy(true);
    setText("#profileStatus", "Saving profile.", "");

    const result = await S.updateCurrentProfile(payload);
    if (!result.ok) {
      setError("#profileError", result.message || "Profile could not be saved.");
      setText("#profileStatus", "", "");
    } else {
      currentProfile = result.data;
      setText("#profileStatus", "Profile saved.", "");
      renderProfileForm(currentProfile);
      renderStatus();
    }

    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await S.signOut();
    window.location.href = "./auth.html";
  }

  function boot() {
    $("#verifyButton")?.addEventListener("click", verifyDiscord);
    $("#signOutButton")?.addEventListener("click", signOut);
    $("#profileForm")?.addEventListener("submit", saveProfile);
    S.onAuthStateChange(() => {
      loadAccount();
    });
    loadAccount();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
