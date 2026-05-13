/* auth.js - Discord login page */
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
    const login = $("#discordLogin");
    const signOut = $("#signOutButton");
    if (login) login.disabled = busy;
    if (signOut) signOut.disabled = busy;
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
      setText("#authStatus", `Signed in as ${identity}. Open Account to check Discord role verification.`);
    } else {
      setText("#authState", "Signed out");
      setText("#authStatus", "Use Discord to sign in. No password signup is used here.");
    }

    setBusy(false);
  }

  async function login() {
    setBusy(true);
    setError("");
    setText("#authStatus", "Opening Discord sign-in.");

    const result = await S.signInWithDiscord({ redirectTo: "./account.html" });
    if (!result.ok) {
      setError(result.message || "Discord sign-in could not start.");
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
    $("#discordLogin")?.addEventListener("click", login);
    $("#signOutButton")?.addEventListener("click", signOut);
    S.onAuthStateChange(() => {
      render();
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
