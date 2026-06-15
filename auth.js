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

  function providerLogo(providerId) {
    const paths = {
      discord: '<path fill="currentColor" d="M19.95 5.63a16.64 16.64 0 0 0-4.12-1.28.06.06 0 0 0-.07.03 11.54 11.54 0 0 0-.51 1.05 15.4 15.4 0 0 0-4.61 0 10.6 10.6 0 0 0-.52-1.05.07.07 0 0 0-.07-.03c-1.42.25-2.8.68-4.12 1.28a.06.06 0 0 0-.03.03C3.29 9.57 2.58 13.39 2.94 17.16c0 .02.02.05.04.06a16.76 16.76 0 0 0 5.05 2.55c.03.01.06 0 .08-.03.39-.53.73-1.1 1.03-1.7a.06.06 0 0 0-.03-.08 11 11 0 0 1-1.58-.75.07.07 0 0 1 0-.11l.31-.24c.02-.02.05-.02.07-.01a12.04 12.04 0 0 0 10.18 0c.02-.01.05-.01.07.01l.31.24c.04.03.03.08 0 .11-.5.3-1.02.55-1.58.75a.06.06 0 0 0-.03.08c.3.6.64 1.17 1.03 1.7.02.03.05.04.08.03A16.7 16.7 0 0 0 23 17.22a.08.08 0 0 0 .03-.06c.43-4.36-.72-8.15-3.05-11.5a.05.05 0 0 0-.03-.03ZM8.68 14.87c-.99 0-1.8-.91-1.8-2.03 0-1.12.8-2.03 1.8-2.03 1 0 1.82.92 1.8 2.03 0 1.12-.8 2.03-1.8 2.03Zm6.64 0c-.99 0-1.8-.91-1.8-2.03 0-1.12.8-2.03 1.8-2.03 1 0 1.81.92 1.8 2.03 0 1.12-.8 2.03-1.8 2.03Z" />',
      google: '<path fill="#4285f4" d="M22.56 12.25c0-.76-.07-1.49-.2-2.2H12v4.16h5.92a5.06 5.06 0 0 1-2.19 3.32v2.71h3.55c2.08-1.92 3.28-4.74 3.28-7.99Z" /><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.71c-.98.66-2.24 1.05-3.73 1.05-2.87 0-5.3-1.94-6.16-4.54H2.18v2.79A11 11 0 0 0 12 23Z" /><path fill="#fbbc05" d="M5.84 14.14A6.6 6.6 0 0 1 5.5 12c0-.74.12-1.46.34-2.14V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.79Z" /><path fill="#ea4335" d="M12 5.32c1.62 0 3.07.56 4.21 1.65l3.15-3.15A10.57 10.57 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.79C6.7 7.26 9.13 5.32 12 5.32Z" />',
      twitch: '<path fill="currentColor" d="M4.27 3 3 6.65v11.7h4.33V21h2.44l2.67-2.65h3.55L21 13.34V3H4.27Zm14.5 9.23-2.89 2.87h-4l-2.66 2.65V15.1H5.6V5.2h13.16v7.03ZM16.55 7.4v4.18h-2.22V7.4h2.22Zm-5.99 0v4.18H8.33V7.4h2.23Z" />',
      facebook: '<path fill="currentColor" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.24 10.44 22v-7.03H7.9v-2.91h2.54V9.84c0-2.53 1.5-3.93 3.79-3.93 1.1 0 2.24.2 2.24.2v2.48h-1.26c-1.24 0-1.63.78-1.63 1.57v1.9h2.77l-.44 2.91h-2.33V22C18.34 21.24 22 17.08 22 12.06Z" />',
      apple: '<path fill="currentColor" d="M16.37 12.16c-.03-2.48 2.03-3.67 2.12-3.73a4.56 4.56 0 0 0-3.59-1.95c-1.53-.15-2.98.9-3.75.9-.78 0-1.98-.88-3.26-.86a4.83 4.83 0 0 0-4.1 2.48c-1.74 3.03-.44 7.51 1.25 9.97.83 1.2 1.82 2.55 3.12 2.5 1.25-.05 1.72-.81 3.23-.81 1.51 0 1.93.81 3.25.79 1.34-.03 2.19-1.22 3.01-2.43.95-1.39 1.34-2.74 1.36-2.81-.03-.02-2.61-1-2.64-4.05ZM13.9 4.87c.69-.84 1.15-2 1.03-3.15-.99.04-2.18.66-2.89 1.49-.63.73-1.19 1.91-1.04 3.04 1.1.08 2.22-.56 2.9-1.38Z" />',
      kakao: '<path fill="currentColor" d="M12 4C6.48 4 2 7.53 2 11.9c0 2.83 1.88 5.31 4.7 6.7l-.97 3.06a.34.34 0 0 0 .53.37l3.78-2.5c.64.1 1.3.16 1.96.16 5.52 0 10-3.53 10-7.89S17.52 4 12 4Z" />',
      spotify: '<path fill="currentColor" d="M12 2a10 10 0 1 0 .01 0H12Zm4.59 14.42a.62.62 0 0 1-.86.2c-2.36-1.44-5.34-1.77-8.85-.97a.63.63 0 0 1-.28-1.22c3.84-.88 7.13-.5 9.79 1.13.29.18.39.57.2.86Zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.7-1.66-6.82-2.14-10.02-1.17a.78.78 0 1 1-.45-1.5c3.65-1.11 8.2-.58 11.28 1.31.37.23.49.72.26 1.1Zm.11-2.83C14.68 8.95 9.34 8.77 6.24 9.72a.94.94 0 1 1-.55-1.8c3.56-1.08 9.47-.87 13.19 1.34a.94.94 0 0 1-.96 1.61Z" />',
    };
    const id = String(providerId || "phone").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "phone";
    const path = paths[id] || '<path fill="currentColor" d="M16.7 2.8H7.3A2.3 2.3 0 0 0 5 5.1v13.8a2.3 2.3 0 0 0 2.3 2.3h9.4a2.3 2.3 0 0 0 2.3-2.3V5.1a2.3 2.3 0 0 0-2.3-2.3ZM8 5h8v11H8V5Zm4 14.65a1.05 1.05 0 1 1 0-2.1 1.05 1.05 0 0 1 0 2.1Z" />';
    return `<span class="provider-logo provider-logo--${id}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${path}</svg></span>`;
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
        ${providerLogo(provider.id)}
        <span class="provider-button__copy">
          <span>${provider.label}</span>
          <small>${provider.automaticVerification ? "Automatic Discord role check" : "Moderator review required"}</small>
        </span>
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
