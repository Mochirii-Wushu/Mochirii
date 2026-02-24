/* announcements.js — data-driven Announcements renderer (page-scoped; no global rules; no header/footer logic) */
(() => {
  "use strict";

  const JSON_URL = "./data/announcements.json";

  const $ = (sel, root = document) => root.querySelector(sel);

  function setText(el, value) {
    if (!el) return;
    el.textContent = value ?? "";
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
  }

  function formatDate(iso) {
    const s = String(iso || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const [y, m, d] = s.split("-").map((n) => Number(n));
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (Number.isNaN(dt.getTime())) return s;
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }

  function applyHero(meta) {
    const heroImg = $("#announcementsHeroImage");
    const atmos = $("#announcementsAtmosphere");

    const heroSrc = meta?.hero?.image;
    const atmosSrc = meta?.hero?.atmosphere;

    if (heroImg && heroSrc) heroImg.src = heroSrc;
    if (atmos && atmosSrc) {
      atmos.src = atmosSrc;
      // Your current styles.css hides .page-hero__atmos globally; leaving this here
      // keeps data parity with other pages without forcing new global CSS rules.
    }
  }

  function applyMeta(meta) {
    setText($("#announcementsHeading"), meta?.title || "Announcements");
    setText($("#announcementsTagline"), meta?.tagline || "");
    setText($("#announcementsIntro"), meta?.intro || "");
    setText($("#announcementsUpdated"), meta?.updated ? `Updated ${formatDate(meta.updated)}` : "");

    const badgesEl = $("#announcementsBadges");
    if (badgesEl) {
      const badges = Array.isArray(meta?.badges) ? meta.badges : [];
      badgesEl.innerHTML = "";
      badges.forEach((b) => {
        const span = document.createElement("span");
        span.textContent = b;
        badgesEl.appendChild(span);
      });
    }
  }

  function normalizeItems(items) {
    const list = Array.isArray(items) ? items.slice() : [];
    // Pinned first, then newest date first.
    list.sort((a, b) => {
      const ap = a?.pinned ? 1 : 0;
      const bp = b?.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const ad = String(a?.date || "");
      const bd = String(b?.date || "");
      return bd.localeCompare(ad);
    });
    return list;
  }

  function renderAnnouncements(mount, items) {
    if (!mount) return;
    mount.innerHTML = "";

    if (!items.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "No announcements yet.";
      mount.appendChild(p);
      return;
    }

    const frag = document.createDocumentFragment();

    items.forEach((it) => {
      const title = it?.title || "Announcement";
      const date = it?.date ? formatDate(it.date) : "";
      const summary = it?.summary || "";
      const details = Array.isArray(it?.details) ? it.details : [];
      const tags = Array.isArray(it?.tags) ? it.tags : [];
      const pinned = !!it?.pinned;

      const card = document.createElement("section");
      card.className = "glass-card glass-card--soft glass-pad";
      card.setAttribute("data-announcement", esc(it?.id || ""));

      card.innerHTML = `
        <p class="kicker">${pinned ? "Pinned" : "Notice"}${date ? ` • ${esc(date)}` : ""}</p>
        <h3 class="section-title section-title--sm">${esc(title)}</h3>
        ${summary ? `<p class="lede">${esc(summary)}</p>` : ""}
        ${details.length ? `
          <ul class="list-stack">
            ${details.map((d) => `<li>${esc(d)}</li>`).join("")}
          </ul>
        ` : ""}
        ${tags.length ? `
          <div class="badge-row" aria-label="Tags">
            ${tags.map((t) => `<span>${esc(t)}</span>`).join("")}
          </div>
        ` : ""}
      `;

      frag.appendChild(card);
    });

    mount.appendChild(frag);
  }

  async function boot() {
    // Guard: only run on the announcements page.
    if (document.body?.dataset?.page !== "announcements") return;

    const mount = $("#announcementsList");
    const errEl = $("#announcementsError");

    try {
      const data = await fetchJSON(JSON_URL);
      const meta = data?.meta || {};
      applyHero(meta);
      applyMeta(meta);

      const items = normalizeItems(data?.items);
      renderAnnouncements(mount, items);
      if (errEl) errEl.textContent = "";
    } catch (err) {
      console.error(err);
      if (mount) {
        mount.innerHTML = `
          <div class="glass-card glass-card--soft glass-pad">
            <h3 class="section-title section-title--sm">Announcements</h3>
            <p class="muted">Unable to load announcements.</p>
          </div>
        `;
      }
      if (errEl) errEl.textContent = "Unable to load announcements.";
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
