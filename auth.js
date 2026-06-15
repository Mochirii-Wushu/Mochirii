/* auth.js - member login page */
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "auth") return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const S = window.MochiriiSupabase;

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value || "";
  }

  function setError(message) {
    const el = $("#authError");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
  }

  function setBusy(busy) {
    const login = $("#providerGrid");
    const signOut = $("#signOutButton");
    if (login) login.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
    if (signOut) signOut.disabled = busy;
  }

  function renderProviders() {
    const grid = $("#providerGrid");
    if (!grid || !S.enabledAuthProviders) return;
    const providers = S.enabledAuthProviders().filter((provider) => provider.kind === "oauth");
    if (!providers.length) return;

    grid.innerHTML = providers.map((provider) => `
      <button
        class="provider-button${provider.id === "discord" ? " provider-button--primary" : ""}"
        type="button"
        id="${provider.id === "discord" ? "discordLogin" : `provider-${provider.id}`}"
        data-provider="${provider.id}"
      >
        <span>${provider.label}</span>
        <small>${provider.automaticVerification ? "Automatic Discord role check" : "Moderator review required"}</small>
      </button>
    `).join("");
  }

  async function render() {
    setBusy(true);
    setError("");
    setText("#authState", "Checking");
    setText("#authStatus", "Checking your current session.");

    const userResult = await S.getUser();
    const user = userResult.data;
    const signedIn = Boolean(userResult.ok && user);

    $("#discordLogin").hidden = signedIn;
    $("#accountLink").hidden = !signedIn;
    $("#signOutButton").hidden = !signedIn;

    if (signedIn) {
      const identity = user.user_metadata?.global_name || user.user_metadata?.full_name || user.email || "Signed in";
      setText("#authState", "Signed in");
      setText("#authStatus", `Signed in as ${identity}. Open Account to check member verification.`);
    } else {
      setText("#authState", "Signed out");
      setText("#authStatus", "Choose a sign-in method. Gallery upload access is verified separately.");
    }

    setBusy(false);
  }

  async function login(providerId = "discord") {
    const provider = S.getConfig().authProviders?.[providerId] || { label: "provider" };
    setBusy(true);
    setError("");
    setText("#authStatus", `Opening ${provider.label} sign-in.`);

    const result = await S.signInWithProvider(providerId, { redirectTo: "./account.html" });
    if (!result.ok) {
      setError(result.message || "Sign-in could not start.");
      setText("#authStatus", "");
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    const result = await S.signOut();
    if (!result.ok) setError(result.message || "Sign out failed.");
    await render();
  }

  function boot() {
    renderProviders();
    $("#providerGrid")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-provider]");
      if (!button) return;
      login(button.dataset.provider || "discord");
    });
    $("#signOutButton")?.addEventListener("click", signOut);
    S.onAuthStateChange(() => {
      render();
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
