// twills.js — profile renderer (page-scoped)
(() => {
  "use strict";

  if (document.body?.dataset?.page !== "twills") return;

  const DATA_URL = "./data/twills.json";
  const $ = (sel, root = document) => root.querySelector(sel);

  function text(v, fallback = "") {
    const s = String(v ?? "").trim();
    return s.length ? s : fallback;
  }

  function clear(el) {
    if (el) el.innerHTML = "";
  }

  function setText(el, v, fallback = "") {
    if (!el) return;
    el.textContent = text(v, fallback);
  }

  function setImg(el, src, alt) {
    if (!el) return;
    const s = text(src, "");
    if (s) el.src = s;
    if (typeof alt === "string") el.alt = alt;
  }

  function renderBadges(mount, badges) {
    if (!mount) return;
    clear(mount);

    const arr = Array.isArray(badges) ? badges : [];
    arr
      .map((b) => text(b, ""))
      .filter(Boolean)
      .slice(0, 10)
      .forEach((b) => {
        const span = document.createElement("span");
        span.textContent = b;
        mount.appendChild(span);
      });
  }

  function renderBio(mount, bio) {
    if (!mount) return;
    clear(mount);

    const arr = Array.isArray(bio) ? bio : [];
    const lines = arr.map((p) => text(p, "")).filter(Boolean);

    if (!lines.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "—";
      mount.appendChild(p);
      return;
    }

    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      mount.appendChild(p);
    });
  }

  async function loadJSON() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    const raw = await res.text();
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (${res.status}).`);
    try {
      return JSON.parse(raw);
    } catch {
      const head = raw.slice(0, 80).replace(/\s+/g, " ").trim();
      throw new Error(`Invalid JSON in ${DATA_URL}. First bytes: "${head}"`);
    }
  }

  (async () => {
    const errEl = $("#twillsError");
    try {
      const data = await loadJSON();

      setText($("#twillsKicker"), data?.hero?.kicker, "Profile");
      setText($("#twillsName"), data?.profile?.name, "Twills");
      setText($("#twillsTimezone"), data?.profile?.timezone, "");

      setImg($("#twillsHeroImage"), data?.hero?.image, "Twills profile banner artwork");
      setImg($("#twillsAvatar"), data?.profile?.avatar, "Twills profile picture");

      setText($("#twillsCardTitle"), data?.profile?.cardTitle, "Portrait");
      setText($("#twillsBioTitle"), data?.profile?.bioTitle, "Bio");

      renderBadges($("#twillsBadges"), data?.profile?.badges);
      renderBio($("#twillsBio"), data?.profile?.bio);

      if (errEl) errEl.classList.add("sr-only");
    } catch (e) {
      console.error(e);
      if (errEl) {
        errEl.classList.remove("sr-only");
        errEl.textContent = `Profile failed to load: ${String(e?.message || e)}`;
      }
      const bio = $("#twillsBio");
      if (bio) bio.innerHTML = `<p class="muted">Unable to load profile.</p>`;
    }
  })();
})();