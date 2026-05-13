/* account.js - member profile and Discord verification UI */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "account") return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const S = window.MochiriiSupabase;
  const U = window.MochiriiUtils;
  const EDITABLE_FIELDS = ["display_name", "game_uid", "discord_handle", "region", "timezone", "avatar_url", "bio"];

  let currentUser = null;
  let currentProfile = null;

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = U.text(value, "Not set");
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

  function hasRecentVerification(profile) {
    const config = S.getConfig();
    const time = new Date(profile?.discord_verified_at || 0).getTime();
    return Number.isFinite(time) && Date.now() - time <= config.recentVerificationMs;
  }

  function renderProfileForm(profile) {
    EDITABLE_FIELDS.forEach((field) => {
      const input = $(`#${field}`);
      if (input) input.value = profile?.[field] || "";
    });
  }

  function renderStatus() {
    const profile = currentProfile || {};
    const status = profile.member_status || "pending";
    const hasRoles = profile.has_required_discord_roles === true;
    const recent = hasRecentVerification(profile);
    const active = status === "active" && hasRoles && recent;

    setText("#memberStatus", status);
    setText("#discordIdentity", signedInName(currentUser, profile));
    setText("#discordVerification", recent ? "Recently verified" : "Needs verification");
    setText("#requiredRoles", hasRoles ? "Both required roles verified" : "Required roles not verified");
    setText("#lastChecked", formatDate(profile.discord_checked_at));

    $("#submitLink").hidden = !active;
    setText(
      "#verifyStatus",
      active
        ? "Gallery upload access is available."
        : "If access is missing, join the Discord server, complete verification, and ask leadership for the required roles.",
    );
  }

  async function loadAccount() {
    setBusy(true);
    setError("#verifyError", "");
    setError("#profileError", "");

    const auth = await S.requireAuth();
    if (!auth.ok) {
      $("#signedOutPanel").hidden = false;
      $("#accountPanel").hidden = true;
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
    } else {
      setError("#verifyError", profileResult.message || "Profile could not be loaded.");
    }

    setBusy(false);
  }

  async function verifyDiscord() {
    setBusy(true);
    setError("#verifyError", "");
    setText("#verifyStatus", "Checking Discord membership and required roles.");

    const result = await S.verifyDiscordMembership();
    if (!result.ok) {
      setError("#verifyError", result.message || "Discord verification failed.");
    } else {
      setText("#verifyStatus", result.data?.message || "Discord verification checked.");
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
    setBusy(true);
    setError("#profileError", "");
    setText("#profileStatus", "Saving profile.");

    const result = await S.updateCurrentProfile(payloadFromForm(form));
    if (!result.ok) {
      setError("#profileError", result.message || "Profile could not be saved.");
      setText("#profileStatus", "");
    } else {
      currentProfile = result.data;
      setText("#profileStatus", "Profile saved.");
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
